import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { runWithTenantContext } from '@/prisma/tenant-context';

// Real-database proof for the tenant-scope Prisma extension. The mocked e2e
// suites cannot exercise `$extends`, so this spec runs against a migrated
// Postgres when RUN_DB_E2E=1 (see `yarn workspace api test:e2e:db`).
const RUN_DB_E2E = process.env.RUN_DB_E2E === '1';
const DATABASE_URL = process.env.DATABASE_URL;
const describeDb = RUN_DB_E2E && DATABASE_URL ? describe : describe.skip;

const SCOPED_MODELS = [
  'product',
  'productCategory',
  'unitOfMeasure',
  'customer',
  'department',
] as const;

type ScopedModel = (typeof SCOPED_MODELS)[number];

interface ScopedDelegate {
  findMany(args?: unknown): Promise<Array<Record<string, unknown>>>;
  findFirst(args?: unknown): Promise<Record<string, unknown> | null>;
  count(args?: unknown): Promise<number>;
  update(args: unknown): Promise<Record<string, unknown>>;
  updateMany(args: unknown): Promise<{ count: number }>;
}

const PATCH: Record<ScopedModel, Record<string, unknown>> = {
  product: { description: 'patched' },
  productCategory: { description: 'patched' },
  unitOfMeasure: { symbol: 'pt' },
  customer: { notes: 'patched' },
  department: { description: 'patched' },
};

describeDb('tenant scoping (real DB)', () => {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  let prisma: PrismaService;
  let a: {
    companyId: string;
    live: Record<string, string>;
    deleted: Record<string, string>;
  };
  let b: {
    companyId: string;
    live: Record<string, string>;
    deleted: Record<string, string>;
    roleId: string;
    userId: string;
  };

  const delegate = (model: string): ScopedDelegate =>
    (prisma as unknown as Record<string, ScopedDelegate>)[model];

  const seedCompany = async (tag: string) => {
    const company = await prisma.company.create({
      data: { name: `tenant-${tag}-${suffix}` },
    });
    const companyId = company.id;

    const uom = await prisma.unitOfMeasure.create({
      data: { companyId, name: `uom-${tag}`, symbol: 'u' },
    });
    const category = await prisma.productCategory.create({
      data: { companyId, name: `cat-${tag}` },
    });
    const product = await prisma.product.create({
      data: { companyId, name: `prod-${tag}`, baseUomId: uom.id },
    });
    const customer = await prisma.customer.create({
      data: {
        companyId,
        name: `cust-${tag}`,
        email: `cust-${tag}-${suffix}@example.test`,
      },
    });
    const department = await prisma.department.create({
      data: { companyId, name: `dept-${tag}` },
    });

    const delUom = await prisma.unitOfMeasure.create({
      data: {
        companyId,
        name: `uom-del-${tag}`,
        symbol: 'u',
        deletedAt: new Date(),
      },
    });
    const delCategory = await prisma.productCategory.create({
      data: { companyId, name: `cat-del-${tag}`, deletedAt: new Date() },
    });
    const delProduct = await prisma.product.create({
      data: {
        companyId,
        name: `prod-del-${tag}`,
        baseUomId: uom.id,
        deletedAt: new Date(),
      },
    });
    const delCustomer = await prisma.customer.create({
      data: {
        companyId,
        name: `cust-del-${tag}`,
        email: `cust-del-${tag}-${suffix}@example.test`,
        deletedAt: new Date(),
      },
    });
    const delDepartment = await prisma.department.create({
      data: { companyId, name: `dept-del-${tag}`, deletedAt: new Date() },
    });

    return {
      companyId,
      live: {
        product: product.id,
        productCategory: category.id,
        unitOfMeasure: uom.id,
        customer: customer.id,
        department: department.id,
      },
      deleted: {
        product: delProduct.id,
        productCategory: delCategory.id,
        unitOfMeasure: delUom.id,
        customer: delCustomer.id,
        department: delDepartment.id,
      },
    };
  };

  beforeAll(async () => {
    prisma = new PrismaService({
      getOrThrow: () => DATABASE_URL,
    } as unknown as ConfigService);
    await prisma.$connect();

    a = await seedCompany('a');
    const seededB = await seedCompany('b');

    const roleB = await prisma.role.create({
      data: { name: `role-b-${suffix}`, companyId: seededB.companyId },
    });
    const userB = await prisma.user.create({
      data: {
        username: `user-b-${suffix}`,
        email: `user-b-${suffix}@example.test`,
        firstName: 'B',
        lastName: 'User',
      },
    });

    b = { ...seededB, roleId: roleB.id, userId: userB.id };
  });

  afterAll(async () => {
    if (!prisma || !a || !b) return;
    await prisma.company.deleteMany({
      where: { id: { in: [a.companyId, b.companyId] } },
    });
    await prisma.user.deleteMany({ where: { id: b.userId } });
    await prisma.$disconnect();
  });

  describe.each(SCOPED_MODELS)('%s', (model) => {
    it('findMany/findFirst/count apply tenant + soft-delete filters', async () => {
      await runWithTenantContext({ companyId: a.companyId }, async () => {
        const rows = await delegate(model).findMany();
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.every((r) => r.companyId === a.companyId)).toBe(true);
        expect(rows.some((r) => r.id === b.live[model])).toBe(false);
        expect(rows.some((r) => r.id === a.deleted[model])).toBe(false);

        await expect(
          delegate(model).findFirst({ where: { id: b.live[model] } }),
        ).resolves.toBeNull();
        await expect(
          delegate(model).findFirst({ where: { id: a.deleted[model] } }),
        ).resolves.toBeNull();
        await expect(
          delegate(model).findFirst({ where: { id: a.live[model] } }),
        ).resolves.not.toBeNull();

        await expect(delegate(model).count()).resolves.toBe(rows.length);
      });
    });

    it('update/updateMany cannot touch another company', async () => {
      await runWithTenantContext({ companyId: a.companyId }, async () => {
        await expect(
          delegate(model).update({
            where: { id: b.live[model] },
            data: PATCH[model],
          }),
        ).rejects.toMatchObject({ code: 'P2025' });

        await expect(
          delegate(model).updateMany({
            where: { id: b.live[model] },
            data: PATCH[model],
          }),
        ).resolves.toEqual({ count: 0 });
      });

      // Outside a tenant context the row is still there and unmodified.
      const untouched = await delegate(model).findFirst({
        where: { id: b.live[model] },
      });
      expect(untouched).not.toBeNull();
    });

    it('update/updateMany cannot touch soft-deleted rows', async () => {
      await runWithTenantContext({ companyId: a.companyId }, async () => {
        await expect(
          delegate(model).update({
            where: { id: a.deleted[model] },
            data: PATCH[model],
          }),
        ).rejects.toMatchObject({ code: 'P2025' });

        await expect(
          delegate(model).updateMany({
            where: { id: a.deleted[model] },
            data: PATCH[model],
          }),
        ).resolves.toEqual({ count: 0 });
      });
    });

    it('update still works on a live row of the active company', async () => {
      await runWithTenantContext({ companyId: a.companyId }, async () => {
        const updated = await delegate(model).update({
          where: { id: a.live[model] },
          data: PATCH[model],
        });
        expect(updated.id).toBe(a.live[model]);
      });
    });
  });

  it('restores a soft-deleted department and blocks a double soft-delete', async () => {
    await runWithTenantContext({ companyId: a.companyId }, async () => {
      const department = await prisma.department.create({
        data: { name: `restore-${suffix}`, companyId: a.companyId },
      });

      const deleted = await prisma.department.update({
        where: { id: department.id },
        data: { deletedAt: new Date() },
      });
      expect(deleted.deletedAt).not.toBeNull();

      await expect(
        prisma.department.update({
          where: { id: department.id },
          data: { deletedAt: new Date() },
        }),
      ).rejects.toMatchObject({ code: 'P2025' });

      const restored = await prisma.department.update({
        where: { id: department.id },
        data: { deletedAt: null },
      });
      expect(restored.deletedAt).toBeNull();
    });
  });

  it('leaves Role and User queries unscoped', async () => {
    await runWithTenantContext({ companyId: a.companyId }, async () => {
      await expect(
        prisma.role.findMany({ where: { id: b.roleId } }),
      ).resolves.toHaveLength(1);
      await expect(
        prisma.user.findMany({ where: { id: b.userId } }),
      ).resolves.toHaveLength(1);
    });
  });
});

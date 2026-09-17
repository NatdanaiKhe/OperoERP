// Set env vars BEFORE any Nest imports so ConfigModule.forRoot picks them up
// (dotenv loaded by @nestjs/config does NOT override existing process.env).
process.env.NODE_ENV = 'test';
process.env.PORT = '4001';
process.env.DATABASE_URL =
  'postgresql://mock:mock@localhost:5432/mock?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long-for-e2e';
process.env.JWT_EXPIRES_IN = '15m';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.WEB_APP_URL = 'http://localhost:3000';
process.env.INVITE_TOKEN_TTL_HOURS = '48';
process.env.RESET_TOKEN_TTL_HOURS = '1';
process.env.RESEND_API_KEY = 're_test_key';
process.env.MAIL_FROM = 'Opero ERP <no-reply@example.com>';
process.env.RESEND_INVITE_TEMPLATE_ID = 'tpl_invite';
process.env.RESEND_RESET_TEMPLATE_ID = 'tpl_reset';
process.env.REDIS_URL = 'redis://localhost:6379';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailProcessor } from '@/notification/email.processor';
import { Prisma } from 'database';

// ---------------------------------------------------------------------------
// In-memory Prisma mock — superset of the subsets of PrismaService methods
// used by the auth login/invite flow and the CompanyService/DepartmentService
// CRUD endpoints.
// ---------------------------------------------------------------------------
export function createMockPrisma() {
  const users = new Map<string, Record<string, unknown>>();
  const refreshTokens = new Map<string, Record<string, unknown>>();
  const tokens = new Map<string, Record<string, unknown>>();
  const companies = new Map<string, Record<string, unknown>>();
  const departments = new Map<string, Record<string, unknown>>();
  const products = new Map<string, Record<string, unknown>>();
  const productCategories = new Map<string, Record<string, unknown>>();
  const uoms = new Map<string, Record<string, unknown>>();
  const roles = new Map<string, Record<string, unknown>>();
  let nextUserId = 1;
  let nextTokenId = 1;
  let nextRefreshTokenId = 1;
  let nextCompanyId = 1;
  let nextDepartmentId = 1;
  let nextProductId = 1;

  // Matches a stored product against the where clause the ProductService
  // builds (companyId, soft-delete, exact categoryId/isActive, contains
  // name/sku). Mirrors the real Prisma semantics the service relies on.
  const matchProductWhere = (
    p: Record<string, unknown>,
    where: Record<string, unknown>,
  ): boolean => {
    if (where.companyId != null && p.companyId !== where.companyId)
      return false;
    if (where.deletedAt === null && p.deletedAt != null) return false;
    if (where.categoryId != null && p.categoryId !== where.categoryId) {
      return false;
    }
    if (where.isActive != null && p.isActive !== where.isActive) return false;
    const name = where.name as { contains?: string } | undefined;
    if (name?.contains != null) {
      const hay = String(p.name ?? '').toLowerCase();
      if (!hay.includes(name.contains.toLowerCase())) return false;
    }
    const sku = where.sku as { contains?: string } | undefined;
    if (sku?.contains != null) {
      const hay = String(p.sku ?? '').toLowerCase();
      if (!hay.includes(sku.contains.toLowerCase())) return false;
    }
    return true;
  };

  // Resolves the `include` relations the ProductService requests.
  const withProductIncludes = (
    p: Record<string, unknown>,
    include?: Record<string, unknown>,
  ): Record<string, unknown> => {
    const result = { ...p };
    if (include?.category) {
      result.category = p.categoryId
        ? (productCategories.get(p.categoryId as string) ?? null)
        : null;
    }
    if (include?.baseUom) {
      result.baseUom = p.baseUomId
        ? (uoms.get(p.baseUomId as string) ?? null)
        : null;
    }
    return result;
  };

  const productNotFoundError = (): Error & { code: string } => {
    return new Prisma.PrismaClientKnownRequestError('Product not found', {
      code: 'P2025',
      clientVersion: 'test',
    });
  };

  return {
    _seed: { departments, roles, products, productCategories, uoms },

    user: {
      findUnique: jest
        .fn()
        .mockImplementation((args: { where: Record<string, unknown> }) => {
          const { where } = args;
          if (where.id) {
            return Promise.resolve(users.get(where.id as string) ?? null);
          }
          if (where.email) {
            for (const u of users.values()) {
              if (u.email === where.email) return Promise.resolve(u);
            }
            return Promise.resolve(null);
          }
          if (where.username) {
            for (const u of users.values()) {
              if (u.username === where.username) return Promise.resolve(u);
            }
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        }),

      findMany: jest
        .fn()
        .mockImplementation(() => Promise.resolve(Array.from(users.values()))),

      create: jest
        .fn()
        .mockImplementation((args: { data: Record<string, unknown> }) => {
          const id = String(nextUserId++);
          const data = { ...args.data };
          // Extract role name from nested userRoles.create.roleId (invite
          // flow) or the legacy role.connect.name shape (test seeding).
          let roleName = 'user';
          let roleCompanyId: string | null = null;
          const userRoles = data.userRoles as
            | {
                create?: {
                  roleId?: string;
                  role?: { connect?: { name?: string } };
                };
              }
            | undefined;
          if (userRoles?.create?.roleId) {
            const seeded = roles.get(userRoles.create.roleId);
            if (seeded) {
              roleName = seeded.name as string;
              roleCompanyId = (seeded.companyId as string) ?? null;
            }
          }
          if (userRoles?.create?.role?.connect?.name) {
            roleName = userRoles.create.role.connect.name;
          }
          delete data.userRoles;
          const user = {
            ...data,
            id,
            userRoles: [
              {
                role: {
                  name: roleName,
                  companyId: roleCompanyId,
                  menuVisibility: [],
                  rolePermissions: [],
                },
              },
            ],
          };
          users.set(id, user);
          return Promise.resolve(user);
        }),

      update: jest
        .fn()
        .mockImplementation(
          (args: { where: { id: string }; data: Record<string, unknown> }) => {
            const user = users.get(args.where.id);
            if (user) Object.assign(user, args.data);
            return Promise.resolve(user);
          },
        ),

      count: jest
        .fn()
        .mockImplementation((args?: { where: Record<string, unknown> }) => {
          const { where } = args ?? {};
          if (where?.departmentId) {
            let n = 0;
            for (const u of users.values()) {
              if (u.departmentId === where.departmentId) n++;
            }
            return Promise.resolve(n);
          }
          return Promise.resolve(users.size);
        }),
    },

    refreshToken: {
      findUnique: jest
        .fn()
        .mockImplementation((args: { where: Record<string, unknown> }) => {
          for (const t of refreshTokens.values()) {
            if (
              t.tokenHash === (args.where as { tokenHash: string }).tokenHash
            ) {
              const user = users.get(t.userId as string);
              return Promise.resolve({ ...t, user });
            }
          }
          return Promise.resolve(null);
        }),

      create: jest
        .fn()
        .mockImplementation((args: { data: Record<string, unknown> }) => {
          const id = String(nextRefreshTokenId++);
          const token = { ...args.data, id, revokedAt: null };
          refreshTokens.set(id, token);
          return Promise.resolve(token);
        }),

      updateMany: jest
        .fn()
        .mockImplementation(
          (args: {
            where: Record<string, unknown>;
            data: Record<string, unknown>;
          }) => {
            let count = 0;
            for (const [, token] of refreshTokens) {
              let matches = true;
              for (const [field, value] of Object.entries(args.where)) {
                const tokenVal = token[field];
                if (value === null) {
                  if (tokenVal != null) {
                    matches = false;
                    break;
                  }
                } else if (tokenVal !== value) {
                  matches = false;
                  break;
                }
              }
              if (matches) {
                Object.assign(token, args.data);
                count++;
              }
            }
            return Promise.resolve({ count });
          },
        ),
    },

    token: {
      create: jest
        .fn()
        .mockImplementation((args: { data: Record<string, unknown> }) => {
          const id = String(nextTokenId++);
          const token = { ...args.data, id, usedAt: null };
          tokens.set(id, token);
          return Promise.resolve(token);
        }),

      findUnique: jest
        .fn()
        .mockImplementation((args: { where: Record<string, unknown> }) => {
          const tokenHash = (args.where as { tokenHash: string }).tokenHash;
          for (const t of tokens.values()) {
            if (t.tokenHash === tokenHash) return Promise.resolve(t);
          }
          return Promise.resolve(null);
        }),

      update: jest
        .fn()
        .mockImplementation(
          (args: { where: { id: string }; data: Record<string, unknown> }) => {
            const token = tokens.get(args.where.id);
            if (token) Object.assign(token, args.data);
            return Promise.resolve(token);
          },
        ),

      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },

    company: {
      create: jest
        .fn()
        .mockImplementation((args: { data: Record<string, unknown> }) => {
          const id = String(nextCompanyId++);
          const company = { ...args.data, id };
          companies.set(id, company);
          return Promise.resolve(company);
        }),

      findMany: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve(Array.from(companies.values())),
        ),

      findUnique: jest
        .fn()
        .mockImplementation((args: { where: { id: string } }) => {
          return Promise.resolve(companies.get(args.where.id) ?? null);
        }),

      update: jest
        .fn()
        .mockImplementation(
          (args: { where: { id: string }; data: Record<string, unknown> }) => {
            const company = companies.get(args.where.id);
            if (company) Object.assign(company, args.data);
            return Promise.resolve(company);
          },
        ),

      // CASCADE: deleting a company also removes its departments.
      delete: jest
        .fn()
        .mockImplementation((args: { where: { id: string } }) => {
          const company = companies.get(args.where.id);
          companies.delete(args.where.id);
          for (const [id, dept] of departments) {
            if (dept.companyId === args.where.id) departments.delete(id);
          }
          return Promise.resolve(company);
        }),
    },

    department: {
      create: jest
        .fn()
        .mockImplementation((args: { data: Record<string, unknown> }) => {
          const id = String(nextDepartmentId++);
          const department = { ...args.data, id };
          departments.set(id, department);
          return Promise.resolve(department);
        }),

      findMany: jest
        .fn()
        .mockImplementation((args?: { where?: { companyId?: string } }) => {
          const all = Array.from(departments.values());
          if (args?.where?.companyId) {
            return Promise.resolve(
              all.filter((d) => d.companyId === args.where?.companyId),
            );
          }
          return Promise.resolve(all);
        }),

      // Handles both { where: { id } } and the compound dup-name check
      // { where: { companyId_name: { companyId, name } } }.
      findUnique: jest
        .fn()
        .mockImplementation((args: { where: Record<string, unknown> }) => {
          const { where } = args;
          if (where.id) {
            return Promise.resolve(departments.get(where.id as string) ?? null);
          }
          if (where.companyId_name) {
            const { companyId, name } = where.companyId_name as {
              companyId: string;
              name: string;
            };
            for (const d of departments.values()) {
              if (d.companyId === companyId && d.name === name) {
                return Promise.resolve(d);
              }
            }
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        }),

      update: jest
        .fn()
        .mockImplementation(
          (args: { where: { id: string }; data: Record<string, unknown> }) => {
            const department = departments.get(args.where.id);
            if (department) Object.assign(department, args.data);
            return Promise.resolve(department);
          },
        ),

      delete: jest
        .fn()
        .mockImplementation((args: { where: { id: string } }) => {
          const department = departments.get(args.where.id);
          departments.delete(args.where.id);
          return Promise.resolve(department);
        }),
    },

    product: {
      create: jest
        .fn()
        .mockImplementation((args: { data: Record<string, unknown> }) => {
          const id = String(nextProductId++);
          const product = {
            ...args.data,
            id,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          };
          products.set(id, product);
          return Promise.resolve(product);
        }),

      findUnique: jest
        .fn()
        .mockImplementation(
          (args: {
            where: { id: string; companyId?: string; deletedAt?: null };
            include?: Record<string, unknown>;
          }) => {
            const { id, companyId } = args.where;
            const product = products.get(id);
            if (!product) return Promise.resolve(null);
            if (companyId && product.companyId !== companyId) {
              return Promise.resolve(null);
            }
            if (args.where.deletedAt === null && product.deletedAt != null) {
              return Promise.resolve(null);
            }
            return Promise.resolve(withProductIncludes(product, args.include));
          },
        ),

      findMany: jest
        .fn()
        .mockImplementation(
          (args?: {
            where?: Record<string, unknown>;
            skip?: number;
            take?: number;
            include?: Record<string, unknown>;
          }) => {
            let all = Array.from(products.values());
            if (args?.where) {
              all = all.filter((p) => matchProductWhere(p, args.where!));
            }
            const skip = args?.skip ?? 0;
            const take = args?.take ?? all.length;
            return Promise.resolve(
              all
                .slice(skip, skip + take)
                .map((p) => withProductIncludes(p, args?.include)),
            );
          },
        ),

      count: jest
        .fn()
        .mockImplementation((args?: { where?: Record<string, unknown> }) => {
          let all = Array.from(products.values());
          if (args?.where) {
            all = all.filter((p) => matchProductWhere(p, args.where!));
          }
          return Promise.resolve(all.length);
        }),

      update: jest
        .fn()
        .mockImplementation(
          (args: {
            where: { id: string; companyId?: string };
            data: Record<string, unknown>;
          }) => {
            const { id, companyId } = args.where;
            const product = products.get(id);
            if (!product || (companyId && product.companyId !== companyId)) {
              return Promise.reject(productNotFoundError());
            }
            Object.assign(product, args.data);
            product.updatedAt = new Date();
            return Promise.resolve(product);
          },
        ),
    },

    productCategory: {
      findMany: jest
        .fn()
        .mockImplementation(
          (args?: {
            where?: { companyId?: string; deletedAt?: null };
            orderBy?: { name?: 'asc' | 'desc' };
          }) => {
            let all = Array.from(productCategories.values());
            const where = args?.where;
            if (where?.companyId) {
              all = all.filter((c) => c.companyId === where.companyId);
            }
            if (where?.deletedAt === null) {
              all = all.filter((c) => c.deletedAt == null);
            }
            if (args?.orderBy?.name) {
              const dir = args.orderBy.name;
              all = all.sort((a, b) =>
                dir === 'asc'
                  ? String(a.name).localeCompare(String(b.name))
                  : String(b.name).localeCompare(String(a.name)),
              );
            }
            return Promise.resolve(all);
          },
        ),
    },

    unitOfMeasure: {
      findMany: jest
        .fn()
        .mockImplementation(
          (args?: {
            where?: { companyId?: string; deletedAt?: null };
            orderBy?: { name?: 'asc' | 'desc' };
          }) => {
            let all = Array.from(uoms.values());
            const where = args?.where;
            if (where?.companyId) {
              all = all.filter((u) => u.companyId === where.companyId);
            }
            if (where?.deletedAt === null) {
              all = all.filter((u) => u.deletedAt == null);
            }
            if (args?.orderBy?.name) {
              const dir = args.orderBy.name;
              all = all.sort((a, b) =>
                dir === 'asc'
                  ? String(a.name).localeCompare(String(b.name))
                  : String(b.name).localeCompare(String(a.name)),
              );
            }
            return Promise.resolve(all);
          },
        ),
    },

    role: {
      findFirst: jest
        .fn()
        .mockImplementation(
          (args: { where: { name?: string; companyId?: string } }) => {
            const { name, companyId } = args.where;
            for (const r of roles.values()) {
              if (r.name === name && r.companyId === companyId) {
                return Promise.resolve(r);
              }
            }
            return Promise.resolve(null);
          },
        ),
    },
  };
}

// ---------------------------------------------------------------------------
// Boot the app with Prisma/queue/processor overridden, mirroring main.ts
// wiring (global prefix, cookie parser, validation pipe).
// ---------------------------------------------------------------------------
export async function createTestApp(
  prisma: ReturnType<typeof createMockPrisma>,
  emailQueue: { add: jest.Mock } = { add: jest.fn().mockResolvedValue({}) },
): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(getQueueToken('email'))
    .useValue(emailQueue)
    .overrideProvider(EmailProcessor)
    .useValue({})
    .compile();

  const app = moduleRef.createNestApplication();

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.init();
  return app;
}

// ---------------------------------------------------------------------------
// Extract the refresh_token value from a Set-Cookie header array.
// ---------------------------------------------------------------------------
export function extractRefreshToken(cookies: string[] | undefined): string {
  return (
    cookies
      ?.find((c) => c.startsWith('refresh_token='))
      ?.match(/refresh_token=([^;]+)/)?.[1] ?? ''
  );
}

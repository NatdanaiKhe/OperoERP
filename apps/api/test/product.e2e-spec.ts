import './helpers';

import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { INestApplication } from '@nestjs/common';
import { createMockPrisma, createTestApp } from './helpers';

const COMPANY_ID = 'company-1';

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('Product (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeAll(async () => {
    mockPrisma = createMockPrisma();

    // Seed a superadmin role scoped to COMPANY_ID so the login JWT carries a
    // non-null companyId (product endpoints scope every query to it), and the
    // superadmin role name bypasses the permissions guard.
    mockPrisma._seed.roles.set('role-superadmin', {
      id: 'role-superadmin',
      name: 'superadmin',
      companyId: COMPANY_ID,
    });

    const passwordHash = bcrypt.hashSync('Superadmin1234!', 10);
    mockPrisma.user.create({
      data: {
        username: 'superadmin',
        email: 'superadmin@example.com',
        password: passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        department: 'IT',
        isActive: true,
        userRoles: {
          create: { roleId: 'role-superadmin' },
        },
      },
    });

    app = await createTestApp(mockPrisma);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@example.com', password: 'Superadmin1234!' })
      .expect(201);
    token = login.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  let productId: string;

  it('POST /api/v1/product — creates a product', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/product')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Widget',
        baseUomId: 'uom-1',
        sku: 'SKU-001',
        defaultSalesPrice: 99.5,
        defaultCost: 40,
      })
      .expect(201);

    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.name).toBe('Widget');
    expect(res.body.companyId).toBe(COMPANY_ID);
    productId = res.body.id;
  });

  it('POST /api/v1/product — rejects missing baseUomId with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/product')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'No UOM' })
      .expect(400);
  });

  it('GET /api/v1/product — lists products with meta', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/product')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((p: { id: string }) => p.id === productId)).toBe(
      true,
    );
    expect(res.body.meta).toEqual({
      total: expect.any(Number),
      page: 1,
      limit: 10,
    });
  });

  it('GET /api/v1/product/:id — returns the product', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/product/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.id).toBe(productId);
    expect(res.body.name).toBe('Widget');
  });

  it('GET /api/v1/product/missing — returns 404', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/product/missing')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('PATCH /api/v1/product/:id — updates the product', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/product/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Widget v2' })
      .expect(200);

    expect(res.body.id).toBe(productId);
    expect(res.body.name).toBe('Widget v2');
  });

  it('DELETE /api/v1/product/:id — soft deletes the product', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/product/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.id).toBe(productId);
    expect(res.body.deletedAt).toEqual(expect.any(String));
  });

  it('GET /api/v1/product/:id — returns 404 after soft delete', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/product/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('DELETE /api/v1/product/missing — returns 404', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/product/missing')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  // -------------------------------------------------------------------------
  // List-page slice: categories, filters, relations.
  // -------------------------------------------------------------------------
  const seedCategory = (
    id: string,
    name: string,
    companyId: string,
    deletedAt: Date | null = null,
  ) => {
    mockPrisma._seed.productCategories.set(id, {
      id,
      companyId,
      name,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt,
    });
  };

  it('GET /api/v1/product/category — company-scoped, non-deleted, ordered by name', async () => {
    seedCategory('cat-b', 'Beta', COMPANY_ID);
    seedCategory('cat-a', 'Alpha', COMPANY_ID);
    seedCategory('cat-z', 'Zeta', COMPANY_ID, new Date());
    seedCategory('cat-other', 'Other', 'other-company');

    const res = await request(app.getHttpServer())
      .get('/api/v1/product/category')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const names = (res.body as { name: string }[]).map((c) => c.name);
    expect(names).toContain('Alpha');
    expect(names).toContain('Beta');
    expect(names).not.toContain('Zeta');
    expect(names).not.toContain('Other');
    expect([...names].sort()).toEqual(names);
  });

  it('GET /api/v1/product?categoryId=... — filters by category', async () => {
    mockPrisma._seed.products.set('p-in-cat', {
      id: 'p-in-cat',
      companyId: COMPANY_ID,
      name: 'In Category',
      sku: 'SKU-CAT',
      categoryId: 'cat-a',
      baseUomId: 'uom-1',
      isActive: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma._seed.products.set('p-no-cat', {
      id: 'p-no-cat',
      companyId: COMPANY_ID,
      name: 'No Category',
      sku: 'SKU-NONE',
      categoryId: null,
      baseUomId: 'uom-1',
      isActive: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/product?categoryId=cat-a')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.map((p: { name: string }) => p.name)).toEqual([
      'In Category',
    ]);
    expect(res.body.meta.total).toBe(1);
  });

  it('GET /api/v1/product?isActive=false — filters inactive products', async () => {
    mockPrisma._seed.products.set('p-inactive', {
      id: 'p-inactive',
      companyId: COMPANY_ID,
      name: 'Inactive Product',
      sku: 'SKU-INACTIVE',
      categoryId: null,
      baseUomId: 'uom-1',
      isActive: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/product?isActive=false')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const active = (res.body.data as { isActive: boolean }[]).map(
      (p) => p.isActive,
    );
    expect(active).toContain(false);
    expect(active.every((v) => v === false)).toBe(true);
  });

  it('GET /api/v1/product — includes category and baseUom relations', async () => {
    mockPrisma._seed.uoms.set('uom-1', {
      id: 'uom-1',
      companyId: COMPANY_ID,
      name: 'Piece',
      symbol: 'pc',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    seedCategory('cat-rel', 'Related', COMPANY_ID);
    mockPrisma._seed.products.set('p-rel', {
      id: 'p-rel',
      companyId: COMPANY_ID,
      name: 'Relation Product',
      sku: 'SKU-REL',
      categoryId: 'cat-rel',
      baseUomId: 'uom-1',
      isActive: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/product?name=Relation')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const product = res.body.data.find((p: { id: string }) => p.id === 'p-rel');
    expect(product).toBeDefined();
    expect(product.category).toEqual(
      expect.objectContaining({ id: 'cat-rel', name: 'Related' }),
    );
    expect(product.baseUom).toEqual(
      expect.objectContaining({ id: 'uom-1', name: 'Piece', symbol: 'pc' }),
    );
  });
});

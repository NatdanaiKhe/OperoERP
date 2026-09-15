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

  beforeAll(async () => {
    const mockPrisma = createMockPrisma();

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
});

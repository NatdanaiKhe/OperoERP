import './helpers';

import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { INestApplication } from '@nestjs/common';
import { createMockPrisma, createTestApp } from './helpers';

const COMPANY_ID = 'company-1';
const OTHER_COMPANY_ID = 'company-2';

// ---------------------------------------------------------------------------
// Customer CRUD + tenant isolation (the mock mirrors the Prisma extension via
// the request's AsyncLocalStorage tenant, so cross-company rows stay hidden).
// ---------------------------------------------------------------------------
describe('Customer (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeAll(async () => {
    mockPrisma = createMockPrisma();

    // Company-scoped superadmin so the JWT carries a companyId.
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
        isActive: true,
        userRoles: { create: { roleId: 'role-superadmin' } },
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

  let customerId: string;

  it('POST /api/v1/customer — creates a customer in the request company', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customer')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Acme Ltd', email: 'billing@acme.test', taxId: 'TAX-1' })
      .expect(201);

    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.companyId).toBe(COMPANY_ID);
    customerId = res.body.id;
  });

  it('POST /api/v1/customer — duplicate email in the company returns 409', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/customer')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Acme Again', email: 'billing@acme.test' })
      .expect(409);
  });

  it('GET /api/v1/customer — lists only the request company customers', async () => {
    mockPrisma._seed.customers.set('foreign-customer', {
      id: 'foreign-customer',
      name: 'Foreign Co',
      email: 'foreign@other.test',
      companyId: OTHER_COMPANY_ID,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/customer')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const ids = (res.body.data as { id: string }[]).map((c) => c.id);
    expect(ids).toContain(customerId);
    expect(ids).not.toContain('foreign-customer');
  });

  it('GET /api/v1/customer/:id — 404 for another company customer', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/customer/foreign-customer')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('PATCH /api/v1/customer/:id — updates the customer', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customer/${customerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Acme Ltd (renamed)' })
      .expect(200);

    expect(res.body.name).toBe('Acme Ltd (renamed)');
  });

  it('DELETE /api/v1/customer/:id — soft deletes, then reads return 404', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customer/${customerId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.deletedAt).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .get(`/api/v1/customer/${customerId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('DELETE /api/v1/customer/:id — 404 for another company customer', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/customer/foreign-customer')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});

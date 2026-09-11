import './helpers';

import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { INestApplication } from '@nestjs/common';
import { createMockPrisma, createTestApp } from './helpers';

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('Company (e2e)', () => {
  let app: INestApplication;
  let superadminToken: string;
  let userToken: string;
  let companyId: string;

  beforeAll(async () => {
    const mockPrisma = createMockPrisma();

    // Seed a superadmin user with a known password.
    const superadminPasswordHash = bcrypt.hashSync('Superadmin1234!', 10);
    mockPrisma.user.create({
      data: {
        username: 'superadmin',
        email: 'superadmin@example.com',
        password: superadminPasswordHash,
        firstName: 'Super',
        lastName: 'Admin',
        department: 'IT',
        isActive: true,
        userRoles: {
          create: { role: { connect: { name: 'superadmin' } } },
        },
      },
    });

    // Seed a regular user with a known password.
    const userPasswordHash = bcrypt.hashSync('User1234!', 10);
    mockPrisma.user.create({
      data: {
        username: 'regularuser',
        email: 'user@example.com',
        password: userPasswordHash,
        firstName: 'Regular',
        lastName: 'User',
        department: 'Sales',
        isActive: true,
        userRoles: {
          create: { role: { connect: { name: 'user' } } },
        },
      },
    });

    app = await createTestApp(mockPrisma);

    // Obtain tokens for both seeded users.
    const superadminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@example.com', password: 'Superadmin1234!' })
      .expect(201);
    superadminToken = superadminLogin.body.accessToken;

    const userLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'User1234!' })
      .expect(201);
    userToken = userLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/company — superadmin creates a company', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/company')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ name: 'Acme' })
      .expect(201);

    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.name).toBe('Acme');
    companyId = res.body.id;
  });

  it('POST /api/v1/company — rejects empty body with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/company')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({})
      .expect(400);
  });

  it('POST /api/v1/company — returns 401 without auth', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/company')
      .send({ name: 'Acme' })
      .expect(401);
  });

  it('POST /api/v1/company — returns 403 for non-superadmin user', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/company')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Acme' })
      .expect(403);
  });

  it('GET /api/v1/company — returns the list of companies', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/company')
      .set('Authorization', `Bearer ${superadminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((c: { id: string }) => c.id === companyId)).toBe(true);
  });

  it('GET /api/v1/company/:id — returns 404 for a missing company', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/company/missing-id')
      .set('Authorization', `Bearer ${superadminToken}`)
      .expect(404);
  });

  it('PATCH /api/v1/company/:id — superadmin updates a company', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/company/${companyId}`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ name: 'Acme Corp' })
      .expect(200);

    expect(res.body.id).toBe(companyId);
    expect(res.body.name).toBe('Acme Corp');
  });

  it('DELETE /api/v1/company/:id — superadmin deletes a company', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/company/${companyId}`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .expect(204);
  });
});

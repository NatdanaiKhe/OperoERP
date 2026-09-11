import './helpers';

import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { INestApplication } from '@nestjs/common';
import { createMockPrisma, createTestApp } from './helpers';

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('Department (e2e)', () => {
  let app: INestApplication;
  let superadminToken: string;
  let companyId: string;
  let assigneeId: string;

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

    // Seed an assignee user with a known password; capture the returned id.
    const assigneePasswordHash = bcrypt.hashSync('Assignee1234!', 10);
    const assignee = await mockPrisma.user.create({
      data: {
        username: 'assignee',
        email: 'assignee@example.com',
        password: assigneePasswordHash,
        firstName: 'As',
        lastName: 'Signee',
        department: 'Ops',
        isActive: true,
        userRoles: {
          create: { role: { connect: { name: 'user' } } },
        },
      },
    });
    assigneeId = assignee.id as string;

    app = await createTestApp(mockPrisma);

    // Obtain token for the superadmin user.
    const superadminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@example.com', password: 'Superadmin1234!' })
      .expect(201);
    superadminToken = superadminLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/company — create a company', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/company')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ name: 'Acme' })
      .expect(201);

    expect(res.body.id).toEqual(expect.any(String));
    companyId = res.body.id;
  });

  let deptId: string;
  it('POST /api/v1/department — superadmin creates a department', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/department')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ name: 'Engineering', companyId })
      .expect(201);

    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.name).toBe('Engineering');
    deptId = res.body.id;
  });

  it('POST /api/v1/department — duplicate name in company returns 409', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/department')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ name: 'Engineering', companyId })
      .expect(409);
  });

  it('GET /api/v1/department?companyId=... — lists departments for company', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/department?companyId=${companyId}`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((d: { id: string }) => d.id === deptId)).toBe(true);
  });

  it('GET /api/v1/department/missing — returns 404', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/department/missing')
      .set('Authorization', `Bearer ${superadminToken}`)
      .expect(404);
  });

  it('PATCH /api/v1/department/:id — updates department name', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/department/${deptId}`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ name: 'Eng' })
      .expect(200);

    expect(res.body.id).toBe(deptId);
    expect(res.body.name).toBe('Eng');
  });

  it('POST /api/v1/department/:id/users/:userId — assigns user to department', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/department/${deptId}/users/${assigneeId}`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .expect(200);
  });

  it('DELETE /api/v1/department/:id — 409 when department still has users', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/department/${deptId}`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .expect(409);
  });

  let deptId2: string;
  it('POST /api/v1/department — creates a second department', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/department')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ name: 'Sales', companyId })
      .expect(201);

    expect(res.body.id).toEqual(expect.any(String));
    deptId2 = res.body.id;
  });

  it('DELETE /api/v1/department/:id — deletes department with no users', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/department/${deptId2}`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .expect(204);
  });

  it('DELETE /api/v1/company/:id — deletes the company', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/company/${companyId}`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .expect(204);
  });

  it('GET /api/v1/department?companyId=... — empty after company cascade delete', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/department?companyId=${companyId}`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .expect(200);

    expect(res.body).toEqual([]);
  });
});

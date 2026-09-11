import './helpers';

import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { INestApplication } from '@nestjs/common';
import {
  createMockPrisma,
  createTestApp,
  extractRefreshToken,
} from './helpers';

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let adminAccessToken: string;
  let userAccessToken: string;
  let refreshTokenValue: string;
  let inviteToken = '';
  let resetToken = '';

  const emailQueueMock = {
    add: jest
      .fn()
      .mockImplementation((_name: string, data: Record<string, string>) => {
        const inviteMatch = data.inviteUrl?.match(/token=([^&]+)/);
        if (inviteMatch) inviteToken = inviteMatch[1];
        const resetMatch = data.resetUrl?.match(/token=([^&]+)/);
        if (resetMatch) resetToken = resetMatch[1];
        return Promise.resolve({});
      }),
  };

  beforeAll(async () => {
    const mockPrisma = createMockPrisma();

    // Seed an admin user with a known password.
    const adminPasswordHash = bcrypt.hashSync('Admin1234!', 10);
    mockPrisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@example.com',
        password: adminPasswordHash,
        firstName: 'Admin',
        lastName: 'User',
        department: 'IT',
        isActive: true,
        userRoles: {
          create: { role: { connect: { name: 'admin' } } },
        },
      },
    });

    // Seed the org data the invite flow validates against: a department and
    // the 'user' role, both in the same company.
    mockPrisma._seed.departments.set('dept-uuid-1', {
      id: 'dept-uuid-1',
      companyId: 'company-1',
    });
    mockPrisma._seed.roles.set('role-user', {
      id: 'role-user',
      name: 'user',
      companyId: 'company-1',
    });

    app = await createTestApp(mockPrisma, emailQueueMock);
  });

  afterAll(async () => {
    await app.close();
  });

  // -----------------------------------------------------------------------
  // 1. Admin login → 201 + accessToken
  // -----------------------------------------------------------------------
  it('POST /api/v1/auth/login — admin logs in', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin1234!' })
      .expect(201);

    expect(res.body.accessToken).toEqual(expect.any(String));
    adminAccessToken = res.body.accessToken;

    refreshTokenValue = extractRefreshToken(
      res.headers['set-cookie'] as unknown as string[] | undefined,
    );
  });

  // -----------------------------------------------------------------------
  // 2. Admin invites a user → 201
  // -----------------------------------------------------------------------
  it('POST /api/v1/auth/invite — admin invites a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        departmentId: 'dept-uuid-1',
        role: 'user',
      })
      .expect(201);

    expect(res.body.message).toBe('Invitation sent successfully');
    expect(res.body.userId).toEqual(expect.any(String));
    expect(emailQueueMock.add).toHaveBeenCalled();
    expect(inviteToken.length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // 3. Invite without auth → 401
  // -----------------------------------------------------------------------
  it('POST /api/v1/auth/invite — returns 401 without auth', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/invite')
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        departmentId: 'dept-uuid-1',
        role: 'user',
      })
      .expect(401);
  });

  // -----------------------------------------------------------------------
  // 4. Accept invite → 200 (sets password, activates account)
  // -----------------------------------------------------------------------
  it('POST /api/v1/auth/accept-invite — user accepts invite', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/accept-invite')
      .send({ token: inviteToken, password: 'Jane1234!' })
      .expect(200);

    expect(res.body.message).toBe('Account activated successfully');
  });

  // -----------------------------------------------------------------------
  // 5. Accept invite replay → 401 (token already used)
  // -----------------------------------------------------------------------
  it('POST /api/v1/auth/accept-invite — rejects replay with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/accept-invite')
      .send({ token: inviteToken, password: 'Jane1234!' })
      .expect(401);
  });

  // -----------------------------------------------------------------------
  // 6. Login with invited user → 201
  // -----------------------------------------------------------------------
  it('POST /api/v1/auth/login — invited user logs in after accepting', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'jane@example.com', password: 'Jane1234!' })
      .expect(201);

    expect(res.body.accessToken).toEqual(expect.any(String));
    userAccessToken = res.body.accessToken;

    refreshTokenValue = extractRefreshToken(
      res.headers['set-cookie'] as unknown as string[] | undefined,
    );
    expect(refreshTokenValue.length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // 7. Profile → 200
  // -----------------------------------------------------------------------
  it('GET /api/v1/auth/profile — returns user info', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    expect(res.body.email).toBe('jane@example.com');
  });

  // -----------------------------------------------------------------------
  // 8. Profile without token → 401
  // -----------------------------------------------------------------------
  it('GET /api/v1/auth/profile — returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/profile').expect(401);
  });

  // -----------------------------------------------------------------------
  // 9. Forgot password → 200 (always succeeds, enumeration-proof)
  // -----------------------------------------------------------------------
  it('POST /api/v1/auth/forgot-password — returns generic success', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'jane@example.com' })
      .expect(200);

    expect(res.body.message).toBe(
      'If the email exists, a reset link has been sent.',
    );
    expect(emailQueueMock.add).toHaveBeenCalled();
    expect(resetToken.length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // 10. Forgot password for unknown email → 200 (same response)
  // -----------------------------------------------------------------------
  it('POST /api/v1/auth/forgot-password — same response for unknown email', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' })
      .expect(200);

    expect(res.body.message).toBe(
      'If the email exists, a reset link has been sent.',
    );
  });

  // -----------------------------------------------------------------------
  // 11. Reset password → 200
  // -----------------------------------------------------------------------
  it('POST /api/v1/auth/reset-password — user resets password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, newPassword: 'NewPass1234!' })
      .expect(200);

    expect(res.body.message).toBe('Password reset successfully');
  });

  // -----------------------------------------------------------------------
  // 12. Login with new password after reset → 201
  // -----------------------------------------------------------------------
  it('POST /api/v1/auth/login — user logs in with new password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'jane@example.com', password: 'NewPass1234!' })
      .expect(201);

    expect(res.body.accessToken).toEqual(expect.any(String));
    userAccessToken = res.body.accessToken;

    refreshTokenValue = extractRefreshToken(
      res.headers['set-cookie'] as unknown as string[] | undefined,
    );
  });

  // -----------------------------------------------------------------------
  // 13. Refresh → 201 + rotated cookie
  // -----------------------------------------------------------------------
  it('POST /api/v1/auth/refresh — rotates tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refresh_token=${refreshTokenValue}`)
      .expect(201);

    expect(res.body.accessToken).toEqual(expect.any(String));
    const cookies = res.headers['set-cookie'] as unknown as
      string[] | undefined;
    expect(cookies?.some((c) => c.startsWith('refresh_token='))).toBe(true);
    refreshTokenValue = extractRefreshToken(cookies);
  });

  // -----------------------------------------------------------------------
  // 14. Logout → 201 + clears cookie
  // -----------------------------------------------------------------------
  it('POST /api/v1/auth/logout — clears refresh cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', `refresh_token=${refreshTokenValue}`)
      .expect(201);

    expect(res.body.message).toBe('Logged out successfully');
  });

  // -----------------------------------------------------------------------
  // 15. Register endpoint removed → 404
  // -----------------------------------------------------------------------
  it('POST /api/v1/auth/register — returns 404 (endpoint removed)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test1234!',
      })
      .expect(404);
  });
});

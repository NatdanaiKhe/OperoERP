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

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcrypt';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailProcessor } from '@/notification/email.processor';

// ---------------------------------------------------------------------------
// In-memory Prisma mock — mimics the subset of PrismaService methods that
// AuthService and AuthController call during the auth flow.
// ---------------------------------------------------------------------------
function createMockPrisma() {
  const users = new Map<string, Record<string, unknown>>();
  const refreshTokens = new Map<string, Record<string, unknown>>();
  const tokens = new Map<string, Record<string, unknown>>();
  const departments = new Map<string, Record<string, unknown>>();
  const roles = new Map<string, Record<string, unknown>>();
  let nextUserId = 1;
  let nextTokenId = 1;
  let nextRefreshTokenId = 1;

  return {
    _seed: { departments, roles },

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
          // Extract role name from nested userRoles.create.roleId (new flow)
          // or the legacy role.connect.name shape (test seeding).
          let roleName = 'user';
          const userRoles = data.userRoles as {
            create?: { roleId?: string; role?: { connect?: { name?: string } } };
          } | undefined;
          if (userRoles?.create?.roleId) {
            const seeded = roles.get(userRoles.create.roleId);
            if (seeded) roleName = seeded.name as string;
          }
          if (userRoles?.create?.role?.connect?.name) {
            roleName = userRoles.create.role.connect.name;
          }
          delete data.userRoles;
          const user = {
            ...data,
            id,
            userRoles: [{ role: { name: roleName, menuVisibility: [] } }],
          };
          users.set(id, user);
          return Promise.resolve(user);
        }),

      update: jest
        .fn()
        .mockImplementation(
          (args: {
            where: { id: string };
            data: Record<string, unknown>;
          }) => {
            const user = users.get(args.where.id);
            if (user) Object.assign(user, args.data);
            return Promise.resolve(user);
          },
        ),
    },

    department: {
      findUnique: jest
        .fn()
        .mockImplementation((args: { where: { id: string } }) =>
          Promise.resolve(departments.get(args.where.id) ?? null),
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

    refreshToken: {
      findUnique: jest
        .fn()
        .mockImplementation((args: { where: Record<string, unknown> }) => {
          for (const t of refreshTokens.values()) {
            if (
              t.tokenHash ===
              (args.where as { tokenHash: string }).tokenHash
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
          (args: {
            where: { id: string };
            data: Record<string, unknown>;
          }) => {
            const token = tokens.get(args.where.id);
            if (token) Object.assign(token, args.data);
            return Promise.resolve(token);
          },
        ),

      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

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

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(getQueueToken('email'))
      .useValue(emailQueueMock)
      .overrideProvider(EmailProcessor)
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication();

    // Mirror main.ts wiring
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();
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

    const cookies = res.headers['set-cookie'] as unknown as
      | string[]
      | undefined;
    refreshTokenValue =
      cookies?.find((c) => c.startsWith('refresh_token='))?.match(/refresh_token=([^;]+)/)?.[1] ??
      '';
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

    const cookies = res.headers['set-cookie'] as unknown as
      | string[]
      | undefined;
    refreshTokenValue =
      cookies?.find((c) => c.startsWith('refresh_token='))?.match(/refresh_token=([^;]+)/)?.[1] ??
      '';
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

    const cookies = res.headers['set-cookie'] as unknown as
      | string[]
      | undefined;
    refreshTokenValue =
      cookies?.find((c) => c.startsWith('refresh_token='))?.match(/refresh_token=([^;]+)/)?.[1] ??
      '';
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
      | string[]
      | undefined;
    expect(cookies?.some((c) => c.startsWith('refresh_token='))).toBe(true);
    refreshTokenValue =
      cookies?.find((c) => c.startsWith('refresh_token='))?.match(/refresh_token=([^;]+)/)?.[1] ??
      '';
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

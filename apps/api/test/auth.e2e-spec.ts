// Set env vars BEFORE any Nest imports so ConfigModule.forRoot picks them up
// (dotenv loaded by @nestjs/config does NOT override existing process.env).
process.env.NODE_ENV = 'test';
process.env.PORT = '4001';
process.env.DATABASE_URL =
  'postgresql://mock:mock@localhost:5432/mock?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long-for-e2e';
process.env.JWT_EXPIRES_IN = '15m';
process.env.CORS_ORIGIN = 'http://localhost:3000';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';

// ---------------------------------------------------------------------------
// In-memory Prisma mock — mimics the subset of PrismaService methods that
// AuthService and AuthController call during the auth flow.
// ---------------------------------------------------------------------------
function createMockPrisma() {
  const users = new Map<string, Record<string, unknown>>();
  const refreshTokens = new Map<string, Record<string, unknown>>();
  let nextUserId = 1;
  let nextTokenId = 1;

  return {
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

      create: jest
        .fn()
        .mockImplementation((args: { data: Record<string, unknown> }) => {
          const id = String(nextUserId++);
          // Discard nested userRoles — RBAC connect is a side-effect we
          // don't exercise here.  Include a mock userRoles array so the
          // controller's `.map(ur => ur.role.name)` still works.
          const data = { ...args.data };
          delete data.userRoles;
          const user = {
            ...data,
            id,
            isActive: true,
            userRoles: [{ role: { name: 'user' } }],
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
    },

    refreshToken: {
      findUnique: jest
        .fn()
        .mockImplementation((args: { where: Record<string, unknown> }) => {
          for (const t of refreshTokens.values()) {
            if (
              t.tokenHash === (args.where as { tokenHash: string }).tokenHash
            ) {
              // Embed user data for the refresh flow (refresh → login chain)
              const user = users.get(t.userId as string);
              return Promise.resolve({ ...t, user });
            }
          }
          return Promise.resolve(null);
        }),

      create: jest
        .fn()
        .mockImplementation((args: { data: Record<string, unknown> }) => {
          const id = String(nextTokenId++);
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
                  // null / undefined both mean "not yet revoked"
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
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshTokenValue: string;

  beforeAll(async () => {
    const mockPrisma = createMockPrisma();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
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
  // 1. Register — valid payload → 201
  // -----------------------------------------------------------------------
  it('POST /api/v1/auth/register — registers a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test1234!',
        firstName: 'Test',
        lastName: 'User',
      })
      .expect(201);

    expect(res.body.message).toBe('User registered successfully');
  });

  // -----------------------------------------------------------------------
  // 2. Register — duplicate email → 409 Conflict
  // -----------------------------------------------------------------------
  it('POST /api/v1/auth/register — rejects duplicate email with 409', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        username: 'testuser2',
        email: 'test@example.com',
        password: 'Test1234!',
      })
      .expect(409);
  });

  // -----------------------------------------------------------------------
  // 3. Login — valid credentials → 200 + accessToken + refresh cookie
  // -----------------------------------------------------------------------
  it('POST /api/v1/auth/login — returns access token and sets refresh cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'Test1234!' })
      .expect(201);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.accessToken.length).toBeGreaterThan(0);
    accessToken = res.body.accessToken;

    // Extract refresh-token value from Set-Cookie for later tests.
    const cookies = res.headers['set-cookie'] as unknown as
      string[] | undefined;
    expect(cookies).toBeDefined();
    const refreshCookie = cookies?.find((c) => c.startsWith('refresh_token='));
    expect(refreshCookie).toBeDefined();
    refreshTokenValue =
      refreshCookie?.match(/refresh_token=([^;]+)/)?.[1] ?? '';
    expect(refreshTokenValue.length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // 4a. Profile — with valid Bearer token → 200
  // -----------------------------------------------------------------------
  it('GET /api/v1/auth/profile — returns user info with valid token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.email).toBe('test@example.com');
    expect(res.body.username).toBe('testuser');
    expect(res.body.firstName).toBe('Test');
  });

  // -----------------------------------------------------------------------
  // 4b. Profile — without token → 401
  // -----------------------------------------------------------------------
  it('GET /api/v1/auth/profile — returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/profile').expect(401);
  });

  // -----------------------------------------------------------------------
  // 5. Refresh — valid cookie → 200 + new accessToken + rotated cookie
  // -----------------------------------------------------------------------
  it('POST /api/v1/auth/refresh — rotates tokens via refresh cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refresh_token=${refreshTokenValue}`)
      .expect(201);

    // New access token returned (JWT payload may be identical if issued in the
    // same second, so we check existence rather than strict inequality).
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.accessToken.length).toBeGreaterThan(0);

    // A fresh refresh cookie should be set (rotation).
    const cookies = res.headers['set-cookie'] as unknown as
      string[] | undefined;
    expect(cookies?.some((c) => c.startsWith('refresh_token='))).toBe(true);

    // Capture updated state.
    accessToken = res.body.accessToken;
    const freshCookie = cookies?.find((c) => c.startsWith('refresh_token='));
    const newRefreshValue =
      freshCookie?.match(/refresh_token=([^;]+)/)?.[1] ?? '';
    // Refresh token value must be different (it's random hex).
    expect(newRefreshValue).not.toBe(refreshTokenValue);
    refreshTokenValue = newRefreshValue;
  });

  // -----------------------------------------------------------------------
  // 6. Logout — clears refresh cookie, returns 200
  // -----------------------------------------------------------------------
  it('POST /api/v1/auth/logout — clears refresh cookie and returns success', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', `refresh_token=${refreshTokenValue}`)
      .expect(201);

    expect(res.body.message).toBe('Logged out successfully');

    // Cookie should be cleared (Max-Age=0 or immediate expiry).
    const cookies = res.headers['set-cookie'] as unknown as
      string[] | undefined;
    const clearCookie = cookies?.find((c) => c.startsWith('refresh_token='));
    expect(clearCookie).toBeDefined();
    // Express clearCookie sets Max-Age=0 or Expires in the past.
    expect(
      /Max-Age=0|expires=Thu,\s*01\s+Jan\s+1970/i.test(clearCookie ?? ''),
    ).toBe(true);
  });
});

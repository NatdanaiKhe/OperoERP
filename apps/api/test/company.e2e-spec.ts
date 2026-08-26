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
// In-memory Prisma mock — mimics the subset of PrismaService methods used by
// the auth login flow and the CompanyService CRUD endpoints.
// ---------------------------------------------------------------------------
function createMockPrisma() {
  const users = new Map<string, Record<string, unknown>>();
  const refreshTokens = new Map<string, Record<string, unknown>>();
  const companies = new Map<string, Record<string, unknown>>();
  let nextUserId = 1;
  let nextRefreshTokenId = 1;
  let nextCompanyId = 1;

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

      findMany: jest
        .fn()
        .mockImplementation(() => Promise.resolve(Array.from(users.values()))),

      create: jest
        .fn()
        .mockImplementation((args: { data: Record<string, unknown> }) => {
          const id = String(nextUserId++);
          const data = { ...args.data };
          let roleName = 'user';
          const userRoles = data.userRoles as {
            create?: { role?: { connect?: { name?: string } } };
          } | undefined;
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

    refreshToken: {
      create: jest
        .fn()
        .mockImplementation((args: { data: Record<string, unknown> }) => {
          const id = String(nextRefreshTokenId++);
          const token = { ...args.data, id, revokedAt: null };
          refreshTokens.set(id, token);
          return Promise.resolve(token);
        }),
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
        .mockImplementation(() => Promise.resolve(Array.from(companies.values()))),

      findUnique: jest
        .fn()
        .mockImplementation((args: { where: { id: string } }) => {
          return Promise.resolve(companies.get(args.where.id) ?? null);
        }),

      update: jest
        .fn()
        .mockImplementation(
          (args: {
            where: { id: string };
            data: Record<string, unknown>;
          }) => {
            const company = companies.get(args.where.id);
            if (company) Object.assign(company, args.data);
            return Promise.resolve(company);
          },
        ),

      delete: jest
        .fn()
        .mockImplementation((args: { where: { id: string } }) => {
          const company = companies.get(args.where.id);
          companies.delete(args.where.id);
          return Promise.resolve(company);
        }),
    },
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('Company (e2e)', () => {
  let app: INestApplication;
  let superadminToken: string;
  let userToken: string;
  let companyId: string;

  const emailQueueMock = {
    add: jest.fn().mockResolvedValue({}),
  };

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

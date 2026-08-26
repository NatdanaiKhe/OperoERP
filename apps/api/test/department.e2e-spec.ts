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
// the auth login flow and the CompanyService/DepartmentService CRUD endpoints.
// ---------------------------------------------------------------------------
function createMockPrisma() {
  const users = new Map<string, Record<string, unknown>>();
  const refreshTokens = new Map<string, Record<string, unknown>>();
  const companies = new Map<string, Record<string, unknown>>();
  const departments = new Map<string, Record<string, unknown>>();
  let nextUserId = 1;
  let nextRefreshTokenId = 1;
  let nextCompanyId = 1;
  let nextDepartmentId = 1;

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
          (args: {
            where: { id: string };
            data: Record<string, unknown>;
          }) => {
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
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('Department (e2e)', () => {
  let app: INestApplication;
  let superadminToken: string;
  let companyId: string;
  let assigneeId: string;

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

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthService } from '@/auth/auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditLogService } from '@/audit/audit-log.service';
import { NotificationService } from '@/notification/notification.service';
import { CacheService } from '@/cache/cache.service';
import type { Request } from 'express';

jest.mock('bcrypt');

const reqMock = {
  ip: '127.0.0.1',
  headers: { 'user-agent': 'jest' },
} as Request;

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    department: {
      findUnique: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    token: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const configServiceMock = {
    get: jest.fn((key: string) => {
      const values: Record<string, string | number> = {
        JWT_SECRET: 'test-secret-that-is-at-least-32-chars-long',
        JWT_EXPIRES_IN: '15m',
        NODE_ENV: 'test',
        WEB_APP_URL: 'http://localhost:3000',
        INVITE_TOKEN_TTL_HOURS: 48,
        RESET_TOKEN_TTL_HOURS: 1,
      };
      return values[key] ?? null;
    }),
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string | number> = {
        JWT_SECRET: 'test-secret-that-is-at-least-32-chars-long',
        JWT_EXPIRES_IN: '15m',
        NODE_ENV: 'test',
        WEB_APP_URL: 'http://localhost:3000',
        INVITE_TOKEN_TTL_HOURS: 48,
        RESET_TOKEN_TTL_HOURS: 1,
      };
      const value = values[key];
      if (value === undefined) throw new Error(`Config key "${key}" not found`);
      return value;
    }),
  };

  const auditLogMock = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const notificationMock = {
    sendInviteEmail: jest.fn().mockResolvedValue(undefined),
    sendResetEmail: jest.fn().mockResolvedValue(undefined),
  };

  const cacheServiceMock = {
    getOrSet: jest.fn(
      async <T>(_key: string, _ttl: number, loader: () => Promise<T>) =>
        loader(),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: JwtService, useValue: { sign: jest.fn(() => 'token') } },
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditLogService, useValue: auditLogMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: CacheService, useValue: cacheServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- invite ---

  it('invites a new user: creates with null password, isActive=false, sends email', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(null) // email check
      .mockResolvedValueOnce(null); // username check
    prismaMock.department.findUnique.mockResolvedValue({
      companyId: 'company-1',
    });
    prismaMock.role.findFirst.mockResolvedValue({ id: 'role-user' });
    prismaMock.user.create.mockResolvedValue({ id: 'new-user-id' });
    prismaMock.token.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.token.create.mockResolvedValue({});

    const result = await service.invite(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        departmentId: 'dept-uuid-1',
        role: 'user',
      },
      reqMock,
    );

    expect(result).toEqual({ userId: 'new-user-id' });
    // Validation: role is resolved scoped to the user's company.
    expect(prismaMock.role.findFirst).toHaveBeenCalledWith({
      where: { name: 'user', companyId: 'company-1' },
      select: { id: true },
    });
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'jane@example.com',
          password: null,
          isActive: false,
          departmentId: 'dept-uuid-1',
          userRoles: { create: { roleId: 'role-user' } },
        }),
      }),
    );
    expect(notificationMock.sendInviteEmail).toHaveBeenCalledWith(
      'jane@example.com',
      'Jane Doe',
      expect.stringContaining('/auth/accept-invite?token='),
    );
    expect(auditLogMock.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'INVITE_SENT' }),
    );
  });

  it('throws ConflictException when email is already in use by active user', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'existing-id',
      isActive: true,
    });

    await expect(
      service.invite(
        {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          departmentId: 'dept-uuid-1',
          role: 'user',
        },
        reqMock,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('re-issues invite token for pending (inactive) user', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'pending-id',
      isActive: false,
    });
    prismaMock.token.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.token.create.mockResolvedValue({});

    const result = await service.invite(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        departmentId: 'dept-uuid-1',
        role: 'user',
      },
      reqMock,
    );

    expect(result).toEqual({ userId: 'pending-id' });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(notificationMock.sendInviteEmail).toHaveBeenCalled();
  });

  it("throws BadRequestException when role is not in the user's company", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(null) // email check
      .mockResolvedValueOnce(null); // username check
    // 'user' role only exists in company-2; invitee's department is company-1.
    prismaMock.department.findUnique.mockResolvedValue({
      companyId: 'company-1',
    });
    prismaMock.role.findFirst.mockResolvedValue(null);

    await expect(
      service.invite(
        {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          departmentId: 'dept-uuid-1',
          role: 'user',
        },
        reqMock,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('throws BadRequestException for unknown department', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(null) // email check
      .mockResolvedValueOnce(null); // username check
    prismaMock.department.findUnique.mockResolvedValue(null);

    await expect(
      service.invite(
        {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          departmentId: 'dept-does-not-exist',
          role: 'user',
        },
        reqMock,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.role.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  // --- acceptInvite ---

  it('accepts invite: sets password, activates, marks token used', async () => {
    prismaMock.token.findUnique.mockResolvedValueOnce({
      id: 'tok-1',
      userId: 'user-1',
      type: 'INVITE',
      usedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });
    (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed-pass');
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.token.update.mockResolvedValue({});

    await service.acceptInvite(
      { token: 'raw-token', password: 'newpass123' },
      reqMock,
    );

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { password: 'hashed-pass', isActive: true },
      }),
    );
    expect(prismaMock.token.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tok-1' },
        data: { usedAt: expect.any(Date) },
      }),
    );
    expect(auditLogMock.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'INVITE_ACCEPTED' }),
    );
  });

  it('rejects accept-invite with invalid token', async () => {
    prismaMock.token.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.acceptInvite({ token: 'bad-token', password: 'newpass123' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects accept-invite with wrong token type', async () => {
    prismaMock.token.findUnique.mockResolvedValueOnce({
      id: 'tok-1',
      userId: 'user-1',
      type: 'PASSWORD_RESET',
      usedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    await expect(
      service.acceptInvite({ token: 'reset-token', password: 'newpass123' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects accept-invite with already-used token', async () => {
    prismaMock.token.findUnique.mockResolvedValueOnce({
      id: 'tok-1',
      userId: 'user-1',
      type: 'INVITE',
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    await expect(
      service.acceptInvite({ token: 'used-token', password: 'newpass123' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects accept-invite with expired token', async () => {
    prismaMock.token.findUnique.mockResolvedValueOnce({
      id: 'tok-1',
      userId: 'user-1',
      type: 'INVITE',
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000 * 60),
    });

    await expect(
      service.acceptInvite({ token: 'expired-token', password: 'newpass123' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  // --- forgotPassword ---

  it('forgot-password for existing active user: creates token, sends email', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      firstName: 'Jane',
      lastName: 'Doe',
      isActive: true,
    });
    prismaMock.token.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.token.create.mockResolvedValue({});

    await service.forgotPassword('jane@example.com', reqMock);

    expect(notificationMock.sendResetEmail).toHaveBeenCalledWith(
      'jane@example.com',
      'Jane Doe',
      expect.stringContaining('/auth/reset-password?token='),
    );
    expect(auditLogMock.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PASSWORD_RESET_REQUESTED' }),
    );
  });

  it('forgot-password for unknown email: resolves silently, no token/email/audit', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await service.forgotPassword('unknown@example.com', reqMock);

    expect(prismaMock.token.create).not.toHaveBeenCalled();
    expect(notificationMock.sendResetEmail).not.toHaveBeenCalled();
    expect(auditLogMock.log).not.toHaveBeenCalled();
  });

  it('forgot-password for inactive user: resolves silently, no token/email/audit', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      firstName: 'Jane',
      lastName: 'Doe',
      isActive: false,
    });

    await service.forgotPassword('jane@example.com', reqMock);

    expect(prismaMock.token.create).not.toHaveBeenCalled();
    expect(notificationMock.sendResetEmail).not.toHaveBeenCalled();
    expect(auditLogMock.log).not.toHaveBeenCalled();
  });

  // --- resetPassword ---

  it('resets password with valid token: sets password, marks used, revokes sessions', async () => {
    prismaMock.token.findUnique.mockResolvedValueOnce({
      id: 'tok-1',
      userId: 'user-1',
      type: 'PASSWORD_RESET',
      usedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });
    (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed-pass');
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.token.update.mockResolvedValue({});
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    await service.resetPassword(
      { token: 'raw-token', newPassword: 'newpass123' },
      reqMock,
    );

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { password: 'hashed-pass' },
      }),
    );
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      }),
    );
    expect(auditLogMock.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PASSWORD_RESET' }),
    );
  });

  it('rejects reset-password with invalid token', async () => {
    prismaMock.token.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.resetPassword({ token: 'bad-token', newPassword: 'newpass123' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  // --- validateUser null password ---

  it('validateUser throws UnauthorizedException when password is null', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      password: null,
      isActive: true,
      userRoles: [{ role: { name: 'user' } }],
    });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    await expect(
      service.validateUser('jane@example.com', 'somepass', reqMock),
    ).rejects.toThrow(UnauthorizedException);
  });

  // --- refresh ---

  it('throws UnauthorizedException when refresh token is missing', async () => {
    await expect(service.refresh(undefined as never)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('persists the refresh token on login', async () => {
    prismaMock.refreshToken.create.mockResolvedValue({});
    await service.login('user-1', ['user'], 'company-1');
    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    });
  });

  it('revokes all sessions on token reuse', async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 1000 * 60),
      user: {
        isActive: true,
        userRoles: [{ role: { name: 'user' } }],
      },
    });
    prismaMock.refreshToken.updateMany.mockResolvedValueOnce({ count: 0 });
    prismaMock.refreshToken.updateMany.mockResolvedValueOnce({ count: 1 });

    await expect(service.refresh('stale-token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  // --- changePassword ---

  it('changes password when current password is correct', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      password: 'old-hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    (bcrypt.hash as jest.Mock).mockResolvedValueOnce('new-hash');
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    await service.changePassword('u1', {
      currentPassword: 'oldpass123',
      newPassword: 'newpass123',
    });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { password: 'new-hash' },
    });
    expect(auditLogMock.log).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1' }),
    );
  });

  it('throws UnauthorizedException when current password is wrong', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      password: 'old-hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    await expect(
      service.changePassword('u1', {
        currentPassword: 'wrongpass',
        newPassword: 'newpass123',
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  // --- listUsers ---

  describe('listUsers', () => {
    const userRow = (overrides: Record<string, unknown> = {}) => ({
      id: 'u1',
      username: 'jane',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      department: null,
      isActive: true,
      userRoles: [{ role: { name: 'user' } }],
      ...overrides,
    });

    it('defaults to active, non-deleted users and excludes superadmin', async () => {
      prismaMock.user.findMany.mockResolvedValue([userRow()]);

      const result = await service.listUsers('company-1');

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            isActive: true,
            NOT: {
              userRoles: { some: { role: { name: 'superadmin' } } },
            },
          }),
        }),
      );
      expect(result).toEqual([
        expect.objectContaining({ id: 'u1', roles: ['user'] }),
      ]);
    });

    it('returns inactive users with ?status=inactive', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        userRow({ isActive: false }),
      ]);

      await service.listUsers('company-1', { status: 'inactive' });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null, isActive: false }),
        }),
      );
    });

    it('returns deleted users with ?status=deleted', async () => {
      prismaMock.user.findMany.mockResolvedValue([userRow()]);

      await service.listUsers('company-1', { status: 'deleted' });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: { not: null },
            isActive: true,
          }),
        }),
      );
    });

    it('combines department and role filters', async () => {
      prismaMock.user.findMany.mockResolvedValue([userRow()]);

      await service.listUsers('company-1', {
        department: 'dept-1',
        role: 'manager',
      });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            departmentId: 'dept-1',
            userRoles: {
              some: { role: { name: 'manager', companyId: 'company-1' } },
            },
          }),
        }),
      );
    });

    it('returns paginated { data, total, page, limit } when limit is passed', async () => {
      prismaMock.user.findMany.mockResolvedValue([userRow()]);
      prismaMock.user.count.mockResolvedValue(23);

      const result = await service.listUsers('company-1', {
        page: 2,
        limit: 10,
      });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(prismaMock.user.count).toHaveBeenCalled();
      expect(result).toEqual({
        data: [expect.objectContaining({ id: 'u1' })],
        total: 23,
        page: 2,
        limit: 10,
      });
    });
  });

  // --- softDeleteUser ---

  it('soft-deletes a user: keeps row, marks inactive + deletedAt, revokes sessions', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'u1' });
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 2 });

    await service.softDeleteUser('u1', reqMock);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { isActive: false, deletedAt: expect.any(Date) },
    });
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(auditLogMock.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'USER_DELETED', userId: 'u1' }),
    );
  });

  it('softDeleteUser throws NotFoundException for unknown user', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await expect(service.softDeleteUser('missing', reqMock)).rejects.toThrow(
      NotFoundException,
    );
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  // --- updateUser ---

  describe('updateUser', () => {
    it('updates department and role, scoped to the department company', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        departmentId: 'dept-1',
        deletedAt: null,
      });
      prismaMock.department.findUnique.mockResolvedValueOnce({
        companyId: 'company-1',
        deletedAt: null,
      });
      prismaMock.role.findFirst.mockResolvedValueOnce({ id: 'role-manager' });
      prismaMock.user.update.mockResolvedValue({});

      const result = await service.updateUser(
        'u1',
        { departmentId: 'dept-2', role: 'manager' },
        reqMock,
      );

      expect(prismaMock.department.findUnique).toHaveBeenCalledWith({
        where: { id: 'dept-2' },
        select: { companyId: true, deletedAt: true },
      });
      expect(prismaMock.role.findFirst).toHaveBeenCalledWith({
        where: { name: 'manager', companyId: 'company-1' },
        select: { id: true },
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          department: { connect: { id: 'dept-2' } },
          userRoles: { deleteMany: {}, create: { roleId: 'role-manager' } },
        },
      });
      expect(auditLogMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_UPDATED', userId: 'u1' }),
      );
      expect(result).toEqual({ message: 'User updated' });
    });

    it('throws BadRequestException when there is nothing to update', async () => {
      await expect(service.updateUser('u1', {})).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a deleted or unknown user', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.updateUser('missing', { role: 'manager' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for an invalid department', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        departmentId: 'dept-1',
        deletedAt: null,
      });
      prismaMock.department.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateUser('u1', { departmentId: 'nope' }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for a role outside the user company', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        departmentId: 'dept-1',
        deletedAt: null,
      });
      prismaMock.department.findUnique.mockResolvedValueOnce({
        companyId: 'company-1',
        deletedAt: null,
      });
      prismaMock.role.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.updateUser('u1', { role: 'foreign_role' }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });

  // --- profile ---

  describe('profile', () => {
    it('loads and caches profile via CacheService', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        username: 'jane',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        isActive: true,
        lastLogin: null,
        userRoles: [
          {
            role: {
              name: 'user',
              companyId: 'c1',
              menuVisibility: [
                { menuKey: 'dashboard', visible: true },
                { menuKey: 'admin', visible: false },
              ],
            },
          },
        ],
      });

      const result = await service.profile('u1');

      expect(cacheServiceMock.getOrSet).toHaveBeenCalledWith(
        'profile:u1',
        expect.any(Number),
        expect.any(Function),
      );
      expect(result).toEqual(
        expect.objectContaining({ id: 'u1', menuConfig: ['dashboard'] }),
      );
    });

    it('throws UnauthorizedException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.profile('u1')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

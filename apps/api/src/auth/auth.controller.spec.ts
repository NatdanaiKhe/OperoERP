import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import type { Request, Response } from 'express';
import type { JwtPayload } from '@/common/decorators/current-user.decorator';

const reqMock = {
  ip: '127.0.0.1',
  headers: { 'user-agent': 'jest' },
} as Request;

const userMock: JwtPayload = {
  userId: 'u1',
  roles: ['user'],
  companyId: 'company-1',
  isSuperAdmin: false,
};

const adminUser: JwtPayload = {
  userId: 'u1',
  roles: ['admin'],
  companyId: 'company-1',
  isSuperAdmin: false,
};

const superadminUser: JwtPayload = {
  userId: 'u1',
  roles: ['superadmin'],
  companyId: 'company-1',
  isSuperAdmin: true,
};

describe('AuthController', () => {
  let controller: AuthController;

  const configServiceMock = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        NODE_ENV: 'test',
        JWT_SECRET: 'test-secret-that-is-at-least-32-chars-long',
        JWT_EXPIRES_IN: '15m',
        CORS_ORIGIN: 'http://localhost:3000',
        DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
        PORT: '4000',
      };
      return values[key] ?? null;
    }),
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        NODE_ENV: 'test',
        JWT_SECRET: 'test-secret-that-is-at-least-32-chars-long',
        JWT_EXPIRES_IN: '15m',
        CORS_ORIGIN: 'http://localhost:3000',
        DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
        PORT: '4000',
      };
      const value = values[key];
      if (value === undefined) throw new Error(`Config key "${key}" not found`);
      return value;
    }),
  };

  const authServiceMock = {
    validateUser: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
    updateLastLogin: jest.fn().mockResolvedValue(undefined),
    profile: jest.fn(),
    listUsers: jest.fn(),
    softDeleteUser: jest.fn().mockResolvedValue(undefined),
    changePassword: jest.fn().mockResolvedValue(undefined),
    invite: jest.fn().mockResolvedValue({ userId: 'new-user-id' }),
    acceptInvite: jest.fn().mockResolvedValue(undefined),
    forgotPassword: jest.fn().mockResolvedValue(undefined),
    resetPassword: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('invites a user (admin only) and returns userId', async () => {
    const result = await controller.invite(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        departmentId: 'dept-uuid-1',
        role: 'user',
      },
      reqMock,
    );
    expect(authServiceMock.invite).toHaveBeenCalledWith(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        departmentId: 'dept-uuid-1',
        role: 'user',
      },
      reqMock,
    );
    expect(result).toEqual({
      message: 'Invitation sent successfully',
      userId: 'new-user-id',
    });
  });

  it('accepts invite and returns success message', async () => {
    const result = await controller.acceptInvite(
      { token: 'raw-token', password: 'newpass123' },
      reqMock,
    );
    expect(authServiceMock.acceptInvite).toHaveBeenCalledWith(
      { token: 'raw-token', password: 'newpass123' },
      reqMock,
    );
    expect(result).toEqual({ message: 'Account activated successfully' });
  });

  it('forgot-password returns generic success message', async () => {
    const result = await controller.forgotPassword(
      { email: 'jane@example.com' },
      reqMock,
    );
    expect(authServiceMock.forgotPassword).toHaveBeenCalledWith(
      'jane@example.com',
      reqMock,
    );
    expect(result).toEqual({
      message: 'If the email exists, a reset link has been sent.',
    });
  });

  it('reset-password returns success message', async () => {
    const result = await controller.resetPassword(
      { token: 'raw-token', newPassword: 'newpass123' },
      reqMock,
    );
    expect(authServiceMock.resetPassword).toHaveBeenCalledWith(
      { token: 'raw-token', newPassword: 'newpass123' },
      reqMock,
    );
    expect(result).toEqual({ message: 'Password reset successfully' });
  });

  it('logs in and returns an access token', async () => {
    authServiceMock.validateUser.mockResolvedValue({
      id: 'user-1',
      userRoles: [{ role: { name: 'user' } }],
    });
    authServiceMock.login.mockResolvedValue({
      accessToken: 'at',
      refreshToken: 'rt',
    });

    const res = { cookie: jest.fn() } as unknown as Response;
    const result = await controller.login(
      { email: 'user@example.com', password: 'password123' },
      reqMock,
      res,
    );

    expect(result).toEqual({ accessToken: 'at' });
    expect(res.cookie).toHaveBeenCalled();
    expect(authServiceMock.updateLastLogin).toHaveBeenCalledWith('user-1');
  });

  it('lists users for admin from their company', async () => {
    authServiceMock.listUsers.mockResolvedValue([
      {
        id: 'u1',
        username: 'admin',
        email: 'a@b.c',
        firstName: 'Admin',
        lastName: 'User',
        department: 'IT',
        isActive: true,
        roles: ['admin'],
      },
    ]);

    const result = await controller.listUsers(adminUser);

    expect(authServiceMock.listUsers).toHaveBeenCalledWith('company-1');
    expect(result).toHaveLength(1);
  });

  it('lists all users for superadmin', async () => {
    authServiceMock.listUsers.mockResolvedValue([
      {
        id: 'u1',
        username: 'admin',
        email: 'a@b.c',
        firstName: 'Admin',
        lastName: 'User',
        department: 'IT',
        isActive: true,
        roles: ['superadmin'],
      },
    ]);

    const result = await controller.listUsers(superadminUser);

    expect(authServiceMock.listUsers).toHaveBeenCalledWith('company-1');
    expect(result).toHaveLength(1);
  });

  it('deletes a user (admin only) and returns success message', async () => {
    const result = await controller.deleteUser('user-1', reqMock);
    expect(authServiceMock.softDeleteUser).toHaveBeenCalledWith(
      'user-1',
      reqMock,
    );
    expect(result).toEqual({ message: 'User deleted' });
  });

  it('changes password and returns success message', async () => {
    const result = await controller.changePassword(
      userMock,
      {
        currentPassword: 'oldpass123',
        newPassword: 'newpass123',
      },
      reqMock,
    );
    expect(authServiceMock.changePassword).toHaveBeenCalledWith(
      'u1',
      {
        currentPassword: 'oldpass123',
        newPassword: 'newpass123',
      },
      reqMock,
    );
    expect(result).toEqual({ message: 'Password changed successfully' });
  });
});

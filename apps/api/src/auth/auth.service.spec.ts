import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '@/auth/auth.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const configServiceMock = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        JWT_SECRET: 'test-secret-that-is-at-least-32-chars-long',
        JWT_EXPIRES_IN: '15m',
        NODE_ENV: 'test',
      };
      return values[key] ?? null;
    }),
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        JWT_SECRET: 'test-secret-that-is-at-least-32-chars-long',
        JWT_EXPIRES_IN: '15m',
        NODE_ENV: 'test',
      };
      const value = values[key];
      if (value === undefined) throw new Error(`Config key "${key}" not found`);
      return value;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: JwtService, useValue: { sign: jest.fn(() => 'token') } },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws ConflictException when email is already registered', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: '1' });
    await expect(
      service.register('user', 'user@example.com', 'password123'),
    ).rejects.toThrow(ConflictException);
  });

  it('throws UnauthorizedException when refresh token is missing', async () => {
    await expect(service.refresh(undefined as never)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('persists the refresh token on login', async () => {
    prismaMock.refreshToken.create.mockResolvedValue({});
    await service.login('user-1', ['user']);
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
});

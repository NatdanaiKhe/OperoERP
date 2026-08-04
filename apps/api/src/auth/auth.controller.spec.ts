import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';

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
    register: jest.fn(),
    validateUser: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    updateLastLogin: jest.fn(),
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

  it('registers a user', async () => {
    await controller.register({
      username: 'user',
      email: 'user@example.com',
      password: 'password123',
    });
    expect(authServiceMock.register).toHaveBeenCalledWith(
      'user',
      'user@example.com',
      'password123',
      undefined,
      undefined,
    );
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

    const res = { cookie: jest.fn() };
    const result = await controller.login(
      { email: 'user@example.com', password: 'password123' },
      res as never,
    );

    expect(result).toEqual({ accessToken: 'at' });
    expect(res.cookie).toHaveBeenCalled();
    expect(authServiceMock.updateLastLogin).toHaveBeenCalledWith('user-1');
  });
});

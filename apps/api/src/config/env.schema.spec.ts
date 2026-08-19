import { validateEnv } from '@opero/config';

const validBase: Record<string, string | number> = {
  NODE_ENV: 'test',
  PORT: 4000,
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db?schema=public',
  JWT_SECRET: 'test-secret-that-is-at-least-32-chars-long',
  JWT_EXPIRES_IN: '15m',
  CORS_ORIGIN: 'http://localhost:3000',
  REDIS_URL: 'redis://localhost:6379',
  WEB_APP_URL: 'http://localhost:3000',
  INVITE_TOKEN_TTL_HOURS: 48,
  RESET_TOKEN_TTL_HOURS: 1,
};

describe('env schema — REDIS_URL', () => {
  it('throws when REDIS_URL is missing', () => {
    const { REDIS_URL, ...withoutRedis } = validBase;
    expect(() =>
      validateEnv(withoutRedis as NodeJS.ProcessEnv),
    ).toThrow();
  });

  it('accepts a valid redis:// URL', () => {
    const env = validateEnv(validBase as NodeJS.ProcessEnv);
    expect(env.REDIS_URL).toBe('redis://localhost:6379');
  });

  it('accepts a valid rediss:// URL', () => {
    const env = validateEnv({
      ...validBase,
      REDIS_URL: 'rediss://localhost:6379',
    } as NodeJS.ProcessEnv);
    expect(env.REDIS_URL).toBe('rediss://localhost:6379');
  });

  it('throws for a non-URI value', () => {
    expect(() =>
      validateEnv({
        ...validBase,
        REDIS_URL: 'not-a-url',
      } as NodeJS.ProcessEnv),
    ).toThrow();
  });

  it('throws for a non-redis scheme', () => {
    expect(() =>
      validateEnv({
        ...validBase,
        REDIS_URL: 'http://localhost:6379',
      } as NodeJS.ProcessEnv),
    ).toThrow();
  });
});

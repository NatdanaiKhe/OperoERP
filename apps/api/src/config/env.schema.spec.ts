import { envSchema } from '@opero/config';

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
  it('fails when REDIS_URL is missing', () => {
    const { REDIS_URL, ...withoutRedis } = validBase;
    const { error } = envSchema.validate(withoutRedis);
    expect(error).toBeTruthy();
  });

  it('accepts a valid redis:// URL', () => {
    const { value, error } = envSchema.validate(validBase);
    expect(error).toBeFalsy();
    expect(value.REDIS_URL).toBe('redis://localhost:6379');
  });

  it('accepts a valid rediss:// URL', () => {
    const { value, error } = envSchema.validate({
      ...validBase,
      REDIS_URL: 'rediss://localhost:6379',
    });
    expect(error).toBeFalsy();
    expect(value.REDIS_URL).toBe('rediss://localhost:6379');
  });

  it('fails for a non-URI value', () => {
    const { error } = envSchema.validate({
      ...validBase,
      REDIS_URL: 'not-a-url',
    });
    expect(error).toBeTruthy();
  });

  it('fails for a non-redis scheme', () => {
    const { error } = envSchema.validate({
      ...validBase,
      REDIS_URL: 'http://localhost:6379',
    });
    expect(error).toBeTruthy();
  });
});

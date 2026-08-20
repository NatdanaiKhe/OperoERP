import * as Joi from 'joi';
import { DEFAULT_WEB_ORIGIN } from './defaults';

/**
 * Canonical environment-variable schema for the monorepo.
 * Used by both the API (via Nest ConfigModule) and the database package
 * (via validateEnv in prisma.config.ts / seed.ts).
 *
 * NEXT_PUBLIC_API_URL is intentionally NOT here — it is a web-only public
 * variable that lives in apps/web, not in the centralized config.
 */
export const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(4000),
  DATABASE_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  CORS_ORIGIN: Joi.string().default(DEFAULT_WEB_ORIGIN),
});

export const ENV_VARIABLES = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'CORS_ORIGIN',
] as const;

import * as Joi from 'joi';
import { DEFAULT_WEB_ORIGIN } from './defaults';

/**
 * Canonical environment-variable schema for the monorepo.
 * Used by both the API (via Nest ConfigModule) and the database package
 * (via validateDatabaseEnv in prisma.config.ts / seed.ts).
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
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .required(),
  RESEND_API_KEY: Joi.string().optional(),
  MAIL_FROM: Joi.string().optional(),
  WEB_APP_URL: Joi.string().default(DEFAULT_WEB_ORIGIN),
  INVITE_TOKEN_TTL_HOURS: Joi.number().integer().min(1).default(48),
  RESET_TOKEN_TTL_HOURS: Joi.number().integer().min(1).default(1),
  RESEND_INVITE_TEMPLATE_ID: Joi.string().optional(),
  RESEND_RESET_TEMPLATE_ID: Joi.string().optional(),
});



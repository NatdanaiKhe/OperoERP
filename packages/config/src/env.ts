import * as Joi from 'joi';
import { envSchema } from './env.schema';
import type { AppEnv } from './types';

/**
 * Validate and apply defaults to environment variables.
 *
 * Framework-agnostic — works with plain `process.env` (Node),
 * `import.meta.env` (Vite), or any `Record<string, string | undefined>`.
 *
 * @param env - The raw env object (defaults to process.env).
 * @returns The validated + defaulted env, typed as AppEnv.
 * @throws {Joi.ValidationError} If validation fails.
 */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const { value, error } = envSchema.validate(env, {
    allowUnknown: true,
    abortEarly: true,
  });
  if (error) {
    throw error;
  }
  return value as AppEnv;
}

/**
 * Minimal env validation for the database package — it only ever reads
 * DATABASE_URL. Keeps prisma/seed processes from requiring (or seeing)
 * api-only secrets like JWT_SECRET or REDIS_URL.
 */
const databaseEnvSchema = Joi.object({
  DATABASE_URL: Joi.string().uri().required(),
});

export function validateDatabaseEnv(
  env: NodeJS.ProcessEnv = process.env,
): { DATABASE_URL: string } {
  const { value, error } = databaseEnvSchema.validate(env, {
    allowUnknown: true,
    abortEarly: true,
  });
  if (error) {
    throw error;
  }
  return value as { DATABASE_URL: string };
}

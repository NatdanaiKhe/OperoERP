import * as Joi from 'joi';

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

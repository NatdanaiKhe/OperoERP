// Jest mock for the `database` workspace package.
// The actual generated Prisma client is ESM-only (uses import.meta.url)
// and cannot be resolved in a CJS Jest environment.
// Unit tests already mock PrismaService directly, so this stub is safe.
export const PrismaClient = jest.fn();
export const Prisma = { Prisma: jest.fn() };
export const PrismaPg = jest.fn();

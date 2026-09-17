// Jest mock for the `database` workspace package.
// The actual generated Prisma client is ESM-only (uses import.meta.url)
// and cannot be resolved in a CJS Jest environment.
// Unit tests already mock PrismaService directly, so this stub is safe.
export const PrismaClient = jest.fn();
export const Prisma = {
  Prisma: jest.fn(),
  // Faithful stub of the generated PrismaClientKnownRequestError: captures the
  // `code` so service-side `err.code === 'P2025'` (not-found) checks work.
  PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(
      message: string,
      params: { code: string; clientVersion?: string },
    ) {
      super(message);
      this.code = params.code;
    }
  },
};
export const PrismaPg = jest.fn();

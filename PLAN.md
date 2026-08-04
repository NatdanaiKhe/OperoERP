# PLAN — Centralized Config (`feature/NAT-00`)

## Motivation

Before this branch, `apps/api` and `packages/database` each had separate,
fragile env handling — some via `dotenv`, some via ad-hoc `process.env` reads,
with no shared validation. Adding a new env var meant updating multiple places
and hoping they stayed in sync.

## What `@opero/config` solves

`packages/config` (`@opero/config`) is a workspace package that provides a
**single source of truth** for environment variable validation across the
entire monorepo.

### The 6-var Joi schema (`packages/config/src/env.schema.ts`)

| Variable         | Required | Default                 | Notes                             |
| ---------------- | -------- | ----------------------- | --------------------------------- |
| `NODE_ENV`       | yes (*)  | —                       | `development`/`production`/`test` |
| `PORT`           | yes      | `4000`                  | API listen port                   |
| `DATABASE_URL`   | yes      | —                       | PostgreSQL conn string            |
| `JWT_SECRET`     | yes      | —                       | Min 32 characters                 |
| `JWT_EXPIRES_IN` | no       | `15m`                   | JWT sign options                  |
| `CORS_ORIGIN`    | no       | `http://localhost:3000` | Comma-separated                   |

(*) Required means the schema will reject missing values — but default/defaulting rules
are handled by Joi's `.required()`/`.default()` semantics.

### How consumers use it

- **`apps/api`** — `AppConfigModule` (in `apps/api/src/config/config.module.ts`)
  imports `envSchema` from `@opero/config` and passes it as
  `validationSchema` to Nest's `ConfigModule.forRoot()`. All runtime env reads
  go through `ConfigService.getOrThrow()`, never `process.env`.

- **`packages/database`** — both `prisma.config.ts` and `prisma/seed.ts`
  call `validateEnv(process.env)` from `@opero/config` and use the returned
  `appEnv.DATABASE_URL`. This guarantees the database URL is validated before
  any Prisma operation.

### Turborepo wiring

All `db:*` tasks in `turbo.json` declare `dependsOn: ["@opero/config#build"]`,
so the config package is compiled before any database operation runs.

### Prettier

Prettier is centralized at the root (`.prettierrc` + `"prettier"` in
`package.json`), so `yarn format` reformats the entire monorepo consistently.

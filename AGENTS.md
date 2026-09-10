# AGENTS.md — OperoERP

Turborepo + Yarn 4 monorepo. Branch `feature/NAT-00` lands deferred centralize-config
work on top of the merged auth feature.

> Deeper detail (auth flows, module map, data model, infra, testing map):
> [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Layout

| Package / App     | Dir                 | Notes                                                                                                                                  |
| ----------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`        | `apps/api`          | NestJS 11 (CommonJS) REST API — global prefix `api/v1` (health excluded), `@/*` → `src/*`                                              |
| `apps/web`        | `apps/web`          | Next.js 16 + React 19 + Tailwind 4 (CSS-first via `@tailwindcss/postcss`), `@/*` → `./*`                                               |
| `@opero/config`   | `packages/config`   | **Real workspace package** — Joi `envSchema`, `validateEnv`/`validateDatabaseEnv`, `AppEnv` type, `DEFAULT_WEB_ORIGIN`                 |
| `@opero/database` | `packages/database` | Prisma 7 client + PostgreSQL via `PrismaPg`; 11 models in `prisma/schema.prisma`; barrel re-exports `PrismaClient`/`Prisma`/`PrismaPg` |

## Env flow

- **Schema**: 14 vars — `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET` (min 32),
  `JWT_EXPIRES_IN` (default `15m`), `CORS_ORIGIN` (default `http://localhost:3000`),
  `REDIS_URL` (required), `WEB_APP_URL`, `INVITE_TOKEN_TTL_HOURS` (48),
  `RESET_TOKEN_TTL_HOURS` (1), plus optional `RESEND_API_KEY`, `MAIL_FROM`,
  `RESEND_INVITE_TEMPLATE_ID`, `RESEND_RESET_TEMPLATE_ID`. The Resend vars are
  optional here but `email.processor.ts` reads them via `getOrThrow` → required at
  API boot. `NEXT_PUBLIC_API_URL` is NOT in this schema — it's a web-only public var.

- **`apps/api`**: `config.module.ts` passes `envSchema` (from `@opero/config`) to
  `ConfigModule.forRoot({ validationSchema })`. All runtime reads go through
  `ConfigService.getOrThrow()`. `main.ts` uses `app.get(ConfigService)` + `getOrThrow`
  — **not** raw `process.env`.

- **`packages/database`**: `prisma.config.ts` and `seed.ts` call
  `validateDatabaseEnv(process.env)` from `@opero/config` and use `DATABASE_URL`
  — the only env var the package ever reads.

## Global wiring (`apps/api` post-NAT-00 state)

- Three `APP_GUARD`s, in order: `JwtAuthGuard` (default-deny; `@Public()` opts out)
  → `RolesGuard` (`@Roles(...)`) → `PermissionsGuard` (`@RequirePermissions(...)`)
- `APP_INTERCEPTOR → LoggingInterceptor`
- No `APP_FILTER` — errors use Nest's platform default (the former
  `AllExceptionsFilter` was removed; see `CHANGES.md`)
- `ValidationPipe({ whitelist: true, transform: true })`
- `cookie-parser` (for refresh-token cookies)
- `setGlobalPrefix('api/v1', { exclude: ['health'] })`
- CORS: `origin` from `CORS_ORIGIN` (comma-split), `credentials: true`

## What this is

ERP + CRM for SMBs, built as a **modular monolith**: one NestJS API, one Next.js
web app, two shared packages. MVP flow: Customer → Quotation → Sales Order →
Invoice → Payment (see `REQUIREMENT.md`).

## Architecture at a glance

- **API** (`apps/api/src/app.module.ts`): config, cache, prisma, audit, auth,
  health, notification, roles, queue, company, department.
- **Request path**: web `lib/api-client.ts` → `/api/v1` controller → guards +
  ValidationPipe → service → `PrismaService` → PostgreSQL.
- **Email path**: service → BullMQ `email` queue → `EmailProcessor` → Resend.
- **Web** (`apps/web`): Next.js App Router; feature-sliced
  `app/features/<domain>/{api,hooks,types}.ts`; TanStack Query 5 + Zustand 5.

## Auth & authorization

- Access token: JWT, TTL `JWT_EXPIRES_IN` (15m), payload `sub`/`roles`/`companyId`;
  `isSuperAdmin` is derived from `roles`, never signed.
- Refresh token: opaque, stored SHA-256 hashed + unique, 30d TTL, rotated
  atomically on `/auth/refresh`; reuse detection revokes all sessions. Cookie
  `refresh_token`: httpOnly, sameSite strict, `secure` in prod, path `/api/v1/auth`.
- Guard order: `JwtAuthGuard → RolesGuard → PermissionsGuard`. `@Public()` opts
  out; `@Roles('admin')` matches JWT role names; `@RequirePermissions('user:read')`
  resolves role→permission from DB **per request** (revocable without re-issuing);
  `isSuperAdmin` bypasses permissions.
- Roles are company-scoped (`Role.companyId`); `menuConfig` merges across a
  user's roles (OR).
- One-time `Token`s: `INVITE` (48h) / `PASSWORD_RESET` (1h). Login failures and
  security events are audit-logged.

## Data layer

- `PrismaService` (`apps/api/src/prisma/`) is the single injectable client, using
  the `PrismaPg` adapter.
- 11 models: User, Role, Permission, UserRole, RolePermission, RefreshToken,
  Token, AuditLog, MenuVisibility, Company, Department.
- Soft delete via `deletedAt` on User + Department; Company hard-deletes (cascade).

## Infrastructure

- Redis `CacheService` (ioredis): best-effort, TTL-only (`getOrSet`), no
  invalidation method; profile cache 30s; `lazyConnect` so down Redis never
  blocks boot.
- BullMQ email queue (3 attempts, exponential backoff) → `EmailProcessor` → Resend.
- Dev env via Infisical; `scripts/prisma-env.sh` filters injected secrets to
  `DATABASE_URL` only. CI: GitHub Actions with disposable postgres/redis services.

## Key flows

- **login** → validate creds → JWT + refresh cookie · **refresh** → rotate
  refresh, issue new pair · **invite/accept** and **forgot/reset** → one-time
  tokens + email. Step-by-step in `docs/ARCHITECTURE.md`.

## Where to look

| Task                                    | Start here                                                                        |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| Auth flows (login/refresh/invite/reset) | `apps/api/src/auth/auth.service.ts`, `auth.controller.ts`                         |
| Authorization (guards, decorators)      | `apps/api/src/common/guards/`, `common/decorators/`                               |
| API wiring / global setup               | `apps/api/src/app.module.ts`, `main.ts`                                           |
| Web auth + api client                   | `apps/web/app/features/auth/`, `app/lib/api-client.ts`                            |
| DB schema / Prisma client               | `packages/database/prisma/schema.prisma`, `apps/api/src/prisma/prisma.service.ts` |
| Config / env                            | `packages/config/src/env.schema.ts`, `apps/api/src/config/config.module.ts`       |
| Cache / queue / email                   | `apps/api/src/cache/`, `apps/api/src/queue/`, `apps/api/src/notification/`        |
| Company / department                    | `apps/api/src/company/`, `apps/api/src/department/`                               |
| Tests / Bruno / CI                      | `apps/api/test/`, `bruno/`, `.github/workflows/pr-check.yml`                      |

## Commands

```bash
yarn install
yarn build
yarn dev
yarn typecheck
yarn lint
yarn format

# Database (all depend on @opero/config#build; db:* scripts run through `scripts/prisma-env.sh`, which injects the **api** Infisical project's secrets then filters to only `DATABASE_URL` — prisma never sees api-only secrets; `packages/database/turbo.json` sets `build` to `envMode: loose` so any Infisical auth method passes in CI, while web keeps the root strict env)
yarn turbo db:generate
yarn turbo db:migrate
yarn turbo db:migrate-dev
yarn turbo db:deploy
yarn turbo db:seed

# Testing
yarn workspace api test
yarn workspace api test:e2e
```

# OperoERP — Architecture

> Verified against source on 2026-09-09. Authoritative sources are the code
> under `apps/` and `packages/` (Prisma schema, Nest modules, Next app).
> `graphify-out/` was used as a secondary map only — its repeated "Yarn Release
> (vendored)" communities are noise from the vendored `.yarn` release, so source
> was treated as authoritative.

## Product snapshot

ERP + CRM for small/medium businesses (see `REQUIREMENT.md`). MVP commercial
flow: **Customer → Quotation → Sales Order → Invoice → Payment**. Built as a
modular monolith: one NestJS API, one Next.js web app, two shared workspace
packages, backed by PostgreSQL + Redis.

## System shape

```
apps/web (Next.js 16, React 19, Tailwind 4)
   │  apiFetch (Bearer JWT + credentials:include)
   ▼
apps/api (NestJS 11, CommonJS) ── prefix /api/v1 (health excluded)
   │  guards → ValidationPipe → controller → service
   ▼
packages/database (Prisma 7 client + PrismaPg adapter) ──► PostgreSQL
packages/config  (Joi env validation)                     ──► env at boot
apps/api ── BullMQ 'email' queue ──► EmailProcessor ──► Resend
apps/api ── ioredis CacheService ──► Redis
```

- `@/*` maps to `src/*` in the API, `./*` in the web app.
- `packages/database` is a real workspace package; its barrel re-exports
  `PrismaClient`, `Prisma`, `PrismaPg`.

## API module map

Registered in `apps/api/src/app.module.ts`:

| Module               | Responsibility                                                          | Key surface                                |
| -------------------- | ----------------------------------------------------------------------- | ------------------------------------------ |
| `AppConfigModule`    | Loads + validates env via `ConfigModule.forRoot({ validationSchema })`  | `apps/api/src/config/config.module.ts`     |
| `CacheModule`        | `CacheService` — ioredis, best-effort `getOrSet` (TTL-only)             | `apps/api/src/cache/`                      |
| `PrismaModule`       | `PrismaService` — global injectable PrismaClient with `PrismaPg`        | `apps/api/src/prisma/`                     |
| `AuditModule`        | `AuditLogService.log()` — best-effort writes (errors swallowed to warn) | `apps/api/src/audit/`                      |
| `AuthModule`         | login/refresh/logout, profile, user CRUD, invite, password reset        | `apps/api/src/auth/`                       |
| `HealthModule`       | Terminus: heap < 300MB + DB ping; `@Public()`                           | `apps/api/src/health/health.controller.ts` |
| `NotificationModule` | `NotificationService` enqueues email; `EmailProcessor` sends via Resend | `apps/api/src/notification/`               |
| `RolesModule`        | `GET /roles`, `PUT /roles/:id/menu-config`                              | `apps/api/src/roles/`                      |
| `QueueModule`        | BullMQ root connection parsed from `REDIS_URL`                          | `apps/api/src/queue/queue.module.ts`       |
| `CompanyModule`      | CRUD; superadmin creates/deletes, admin updates                         | `apps/api/src/company/`                    |
| `DepartmentModule`   | CRUD + `assignUser` + `reassignUsers`                                   | `apps/api/src/department/`                 |

## Auth flows

Token types and their storage (all in `apps/api/src/auth/auth.service.ts`):

- **Access token** — JWT signed with `JWT_SECRET`, TTL `JWT_EXPIRES_IN`
  (default `15m`). Payload: `sub` (userId), `roles`, `companyId`.
  `isSuperAdmin` is **not** signed — it is derived from `roles` at validation
  time (`common/utils/auth.utils.ts` → `isSuperAdmin(roles)`).
- **Refresh token** — opaque random hex, stored **SHA-256 hashed** in
  `RefreshToken.tokenHash` (unique), 30-day TTL, delivered via httpOnly cookie
  `refresh_token` (sameSite `strict`, `secure` in prod, path `/api/v1/auth`).
- **One-time tokens** — `Token` table, SHA-256 hashed, types `INVITE` (48h) and
  `PASSWORD_RESET` (1h). Cleanup piggybacks on creation (no cron).

Step-by-step:

1. **Login** (`POST /auth/login`, `@Public`) — `validateUser` bcrypt-compares the
   password; unknown/inactive/no-password users compare against a
   `DUMMY_PASSWORD_HASH` to equalize timing, then audit `LOGIN_FAILURE`. On
   success: `login()` issues access + refresh, refresh cookie is set, `lastLogin`
   updated, `LOGIN_SUCCESS` audited.
2. **Refresh** (`POST /auth/refresh`, `@Public`) — reads the cookie, hashes it,
   looks up `RefreshToken`. **Atomic rotation**: `updateMany({ where: { id,
revokedAt: null } })`; if `count === 0` the token was already rotated →
   reuse detected → audit `REVOKE_ALL`, `revokeAllForUser`, 401. Otherwise a new
   pair is issued and the cookie replaced.
3. **Invite** (`POST /auth/invite`, `@Roles admin|superadmin` +
   `@RequirePermissions user:create`) — resolves company via the invitee's
   department, then the role scoped to that company (cross-company roles don't
   resolve). Creates an inactive user with `password: null`, generates an
   `INVITE` token, emails the accept URL, audits `INVITE_SENT`.
4. **Accept invite** (`POST /auth/accept-invite`, `@Public`) — validates the
   token, sets password + `isActive`, marks token used.
5. **Forgot / reset password** (`@Public`) — `forgotPassword` is
   enumeration-proof (always returns 200; unknown/inactive users are a no-op),
   generates a `PASSWORD_RESET` token and emails it. `resetPassword` validates,
   sets the password, marks the token used, then `revokeAllForUser` (force
   re-login everywhere).
6. **Change password** — verifies current, sets new, `revokeAllForUser`.
7. **Logout** (`@Public`) — revokes the refresh token and clears the cookie.

## Authorization

Three global guards, registered in order in `app.module.ts`:

```
JwtAuthGuard → RolesGuard → PermissionsGuard
```

- **`JwtAuthGuard`** (`common/guards/jwt-auth.guard.ts`) — passport-jwt, Bearer
  header, `JWT_SECRET`. Default-deny; `@Public()` opts out. Validation returns
  `{ userId, roles, companyId, isSuperAdmin }`.
- **`RolesGuard`** — `@Roles('admin','superadmin')` matches against role names
  from the JWT. Explicitly skips `@Public()` routes (no `req.user` there).
- **`PermissionsGuard`** — `@RequirePermissions('user:read')` resolves
  role→permission **from the DB per request** (via `userRole → role →
rolePermissions → permission.name`), so grants are revocable without
  re-issuing tokens. `isSuperAdmin` bypasses; skips `@Public()` routes.

Role semantics: roles are **company-scoped** (`Role.companyId`, unique on
`(companyId, name)`). `GET /auth/profile` merges each user's roles' menu
visibility with **OR** semantics into `profile.menuConfig`, cached 30s.

## Data layer

Prisma 7 (`prisma-client` generator, CJS output to `src/generated/prisma`,
gitignored), PostgreSQL via `@prisma/adapter-pg`. `PrismaService` is the single
injectable client (global module).

11 models in `packages/database/prisma/schema.prisma`, grouped:

- **Identity/RBAC**: `User`, `Role`, `Permission`, `UserRole`, `RolePermission`
- **Tokens**: `RefreshToken`, `Token`
- **Ops**: `AuditLog`, `MenuVisibility`
- **Org**: `Company`, `Department`

Notable details:

- **Soft delete**: `deletedAt` on `User` and `Department` (filtered in queries,
  indexed). `Company` has no soft delete — deleting a company cascades to its
  roles and departments.
- `User` has no `companyId` FK; the RBAC invariant derives it from
  `User.department.companyId` (enforced in the service layer, not the schema).
- `RefreshToken.tokenHash`, `Permission.name`, `User.email`/`username` are
  unique; audit log indexes on `userId`/`action`/`createdAt`.
- Seed (`packages/database/src/seed.ts`) is idempotent: 8 roles, 42
  permissions, default company + "Head Office" department, superadmin/admin
  users, and per-role menu-visibility defaults (fail-closed: hidden by default).

## Infrastructure

- **Redis** — `CacheService` (ioredis) with `lazyConnect` (a down Redis never
  blocks boot) and best-effort `getOrSet`: cache reads/writes degrade to the
  loader, the DB stays the source of truth. TTL-only invalidation (no explicit
  invalidation method); profile cache TTL 30s.
- **Email** — BullMQ `email` queue (3 attempts, exponential backoff,
  `2000ms` delay), `EmailProcessor` worker sends via **Resend** using
  `MAIL_FROM` + template IDs. `RESEND_API_KEY` / `MAIL_FROM` /
  `RESEND_INVITE_TEMPLATE_ID` / `RESEND_RESET_TEMPLATE_ID` are **optional** in
  the env schema but **required at boot** — the processor reads them with
  `getOrThrow`, so the API won't start without them.
- **Env injection** — dev uses Infisical (`infisical run --env=dev`).
  `packages/database/scripts/prisma-env.sh` injects the **api** project's
  secrets then filters down to `DATABASE_URL` only, so Prisma/seed never see
  api-only secrets (`JWT_SECRET`, `REDIS_URL`, `RESEND_*`).
- **CI** — `.github/workflows/pr-check.yml`: `yarn npm audit --severity high`
  - `turbo run lint typecheck test build`, with disposable `postgres:17` and
    `redis:7` service containers.

## Web architecture

- **Data fetching** — TanStack Query 5 (`app/lib/query-client.ts`,
  `staleTime: 60s`, `retry: 1`). All calls go through
  `app/lib/api-client.ts` (`apiFetch`), which attaches `Authorization: Bearer`
  from the Zustand store and always sends `credentials: 'include'` (refresh
  cookie).
- **Auth state** — Zustand 5 (`app/features/auth/store.ts`) holds only
  `accessToken` + `user`. On mount, `useRefreshAuth` (TanStack Query) calls
  `/auth/refresh` if there is no access token, restoring the session from the
  cookie. There is **no automatic 401 retry** — `apiFetch` throws `ApiError`
  and callers decide.
- **Feature slicing** — `app/features/<domain>/{api.ts,hooks.ts,types.ts}`.
  Component hierarchy `atoms → molecules → organisms → templates`.
- **Menu gating** — inline via `useCanAccess(menu)` reading
  `profile.menuConfig`. `app/components/guard/` (`AccessGuard`,
  `PageAccessGuard`) exists but is **unused/dead** — prefer `useCanAccess`.

## Testing map

- Unit specs are colocated with source (`*.spec.ts`), run via
  `yarn workspace api test`.
- E2E lives under `apps/api/test/` (`auth`, `company`, `department` e2e specs)
  with DB mocks in `apps/api/test/mocks/`; run via `yarn workspace api test:e2e`.
- API collections in `bruno/`: Auth, Company, Department, Roles, Health Check.
- CI gates lint/typecheck/test/build (see above).

## Where to look (expanded)

| Task                       | Start here                                                         |
| -------------------------- | ------------------------------------------------------------------ |
| Add a new endpoint/module  | `apps/api/src/app.module.ts`, then a `<feature>/` dir              |
| Auth flow changes          | `apps/api/src/auth/auth.service.ts` + `auth.controller.ts`         |
| Token payload / validation | `apps/api/src/auth/jwt.strategy.ts`, `common/decorators/`          |
| Guard behavior             | `apps/api/src/common/guards/{jwt-auth,roles,permissions}.guard.ts` |
| Web auth handling          | `apps/web/app/features/auth/{api,hooks,store}.ts`                  |
| DB schema / migrations     | `packages/database/prisma/schema.prisma` + `prisma/migrations/`    |
| Prisma client wiring       | `apps/api/src/prisma/prisma.service.ts`                            |
| Config / env vars          | `packages/config/src/env.schema.ts`, `env.ts`                      |
| Cache / queue / email      | `apps/api/src/cache/`, `queue/`, `notification/`                   |
| Company / department       | `apps/api/src/company/`, `apps/api/src/department/`                |
| Seed data                  | `packages/database/src/seed.ts`                                    |
| CI                         | `.github/workflows/pr-check.yml`                                   |

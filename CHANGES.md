# CHANGES — ponytail audit pass on `apps/api`

Over-engineering cleanup. All findings from the repo-wide audit that survived
verification were applied. Correctness, security, and tests untouched except
where the cleanup surfaced a latent issue.

## Redis cache — re-implemented, not removed

The cache is back, but on a design the team signed off on:

- **Direct ioredis** — dropped the `cache-manager` + `keyv` + `@keyv/redis`
  abstraction stack; the cache now uses ioredis, which is already a required
  runtime dep for bullmq.
- **`CacheService.getOrSet(key, ttlMs, loader)`** — one wrapper owns all
  "cache unavailable" handling; callers have zero try/catch.
- **`lazyConnect: true`** — no connection at boot; a down Redis can no longer
  crash app startup (the old `CacheModule` factory did `getOrThrow` at boot).
- **TTL-only invalidation (Posture A)** — 30s bounded staleness for the
  profile/menu-config read; no fan-out invalidation on role/menu writes.
  Upgrade path: company-scoped version key, only if instant propagation is
  ever required.
  - new: `apps/api/src/cache/{cache.service,cache.module}.ts`
  - changed: `auth.service.ts` (`profile()` → `getOrSet` + `loadProfile`),
    `app.module.ts`

## Removed

- **`AllExceptionsFilter`** — reimplemented Nest's built-in exception filter
  to add `timestamp`/`path` and request logging that `LoggingInterceptor`
  already provides. Error responses now use the platform default
  (`{ statusCode, message, error }`). Verified the web client only reads
  `data.message`.
  - deleted `apps/api/src/common/filters/all-exceptions.filter.ts`, dropped
    `APP_FILTER` from `app.module.ts`
- **`DatabaseHealthIndicator` + hand-rolled `withTimeout`** — terminus ships
  `PrismaHealthIndicator` with its own `timeout` option. Replaced the 35-line
  custom indicator with `db.pingCheck('database', prisma, { timeout: 2000 })`.
  - deleted `apps/api/src/health/database.health.ts`

## Shrunk

- **`EmailProcessor`** — `sendInvite`/`sendReset` (two near-identical resend
  calls) collapsed into one `send(jobName, to, templateId, variables)`; error
  message keeps the job name so BullMQ retry/audit behavior is unchanged.
  - `apps/api/src/notification/email.processor.ts`
- **`JwtStrategy`** — deleted the duplicate payload type; token payload now
  references the shared `JwtPayload` from `current-user.decorator`.

## Fixed (surfaced by the audit)

- **`isSuperAdmin` was never in the signed access token** — the strategy read
  `payload.isSuperAdmin` which the token never carried, so it was always
  falsy and superadmin scoping in `RolesController` never engaged. It is now
  derived from the roles claim: `isSuperAdmin(payload.roles)`.
  - `apps/api/src/auth/jwt.strategy.ts`
- **`POST /company` dropped every field except `name`** — `CreateCompanyDto`
  validated 10 fields (address, phone, website, …) that `create()` silently
  discarded while the schema columns and the web app's PATCH payload both use
  them. `create()` now persists the full DTO (`data: dto`).
  - `apps/api/src/company/company.service.ts`

## Trivial

- Un-exported `SUPERADMIN_ROLE` — the constant was never imported; `'superadmin'`
  literals remain (kept `isSuperAdmin` helper).
  - `apps/api/src/common/utils/auth.utils.ts`

## Audited, not applied (verification overruled the audit)

- **QueueModule REDIS_URL parsing** — audit suggested passing the URL string
  straight to bullmq; `ConnectionOptions` does not accept a string, and
  passing an ioredis instance would leak a connection bullmq can't close. The
  8-line parse is the typed minimum. Kept as-is.
- **`ioredis` dependency** — the audit listed it for removal, but bullmq
  declares ioredis as an **optional peer dependency** and `require`s it at
  runtime (`redis-connection.js`) when given plain connection options — our
  QueueModule's exact path. It was initially removed, then restored after a
  runtime smoke test confirmed the queue would throw "BullMQ could not load
  the optional 'ioredis' package" without it. It is now also the cache's
  client. `node_modules/ioredis` is present and the queue builds.

## Verification

- `yarn turbo typecheck --filter=api` — pass
- `yarn turbo lint --filter=api` — 0 errors (3 pre-existing warnings in
  `jwt-auth.guard.ts`, untouched)
- `yarn workspace api test` — 88/88 (incl. new `CacheService` + profile tests)
- `yarn workspace api test:e2e` — 35/35 (profile endpoint exercises the real
  cache against live Redis; `profile:*` keys confirmed present)
- Web typecheck failure is a pre-existing stale `.next` artifact, unrelated.

**Net: -1 file deleted (2), ~-170 lines, -4 dependencies**
(`cache-manager`, `@nestjs/cache-manager`, `@keyv/redis`, `keyv`; ioredis retained).

# Dev Log — 2026-08-04

## Auth work (merged to `main`)

- Branch `feature/NAT-6_authentication` landed the complete auth system:
  JWT + refresh tokens, bcrypt password hashing with timing equalizer,
  RBAC data model (6 Prisma models), 182-line seeder, and JwtAuthGuard
  as the global default-deny guard.
- Merged to `main` before starting centralize-config work.

## Centralize-config reset

- An initial attempt to layer centralize-config into the auth branch was
  aborted — reset to keep the auth branch clean and self-contained.
- Deferred items tracked in `DEFERRED.md`.

## This branch (`feature/NAT-00`)

Lands the deferred work in atomic commits:

1. **Commit 2** — `@opero/config` package with Joi validation, `validateEnv`,
   and `turbo.json` task wiring.
2. **Commit 3** — Prettier centralized at root + full `yarn format`.
3. **Commit 4** — API wires `ConfigService.getOrThrow` in `main.ts`,
   `LoggingInterceptor`, and `APP_FILTER`/`APP_INTERCEPTOR` providers.
4. **Commit 5** — Documentation: `PLAN.md`, `PLAN_AUTH.md`, `LOG.md`,
   canonical `.env.example`, `AGENTS.md`, and stale-ESM cleanup in
   `apps/api/README.md`.
5. **Remaining** — Deps cleanup (remove unused `rxjs`, `dotenv`, `pg`),
   real auth e2e tests, and final verification.

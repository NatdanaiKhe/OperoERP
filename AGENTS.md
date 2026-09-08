# AGENTS.md — OperoERP

Turborepo + Yarn 4 monorepo. Branch `feature/NAT-00` lands deferred centralize-config
work on top of the merged auth feature.

## Layout

| Package / App      | Dir             | Notes |
| ------------------ | --------------- | ----- |
| `apps/api`         | `apps/api`      | NestJS 11 (CommonJS) REST API — global prefix `api/v1` (health excluded), `@/*` → `src/*` |
| `apps/web`         | `apps/web`      | Next.js 16 + React 19 + Tailwind 4 (CSS-first via `@tailwindcss/postcss`), `@/*` → `./*` |
| `@opero/config`    | `packages/config` | **Real workspace package** — Joi `envSchema`, `validateEnv`, `AppEnv` type, `DEFAULT_WEB_ORIGIN` |
| `@opero/database`  | `packages/database` | Prisma 7 client + 6 RBAC models, barrel re-exports `PrismaClient`/`Prisma`/`PrismaPg` |

## Env flow

- **Schema**: 6 vars (`NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET` min 32,
  `JWT_EXPIRES_IN` default `15m`, `CORS_ORIGIN` default `http://localhost:3000`).
  `NEXT_PUBLIC_API_URL` is NOT in this schema — it's a web-only public var.

- **`apps/api`**: `config.module.ts` passes `envSchema` (from `@opero/config`) to
  `ConfigModule.forRoot({ validationSchema })`. All runtime reads go through
  `ConfigService.getOrThrow()`. `main.ts` uses `app.get(ConfigService)` + `getOrThrow`
  — **not** raw `process.env`.

- **`packages/database`**: `prisma.config.ts` and `seed.ts` call
  `validateEnv(process.env)` from `@opero/config` and use `appEnv.DATABASE_URL`.

## Global wiring (`apps/api` post-NAT-00 state)

- `APP_GUARD → JwtAuthGuard` (default-deny; `@Public()` opts out)
- `APP_FILTER → AllExceptionsFilter`
- `APP_INTERCEPTOR → LoggingInterceptor`
- `ValidationPipe({ whitelist: true, transform: true })`
- `cookie-parser` (for refresh-token cookies)
- `setGlobalPrefix('api/v1', { exclude: ['health'] })`

## Commands

```bash
yarn install
yarn build
yarn dev
yarn typecheck
yarn lint
yarn format

# Database (all depend on @opero/config#build; db:* scripts wrap prisma with `infisical run --env=dev` — the DB env lives in the **api** Infisical project, `packages/database/.infisical.json` points there)
yarn turbo db:generate
yarn turbo db:migrate
yarn turbo db:migrate-dev
yarn turbo db:deploy
yarn turbo db:seed

# Testing
yarn workspace api test
yarn workspace api test:e2e
```

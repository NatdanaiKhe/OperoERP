# AGENTS.md — OperoERP

Turborepo + Yarn 4 monorepo. Branch `feature/NAT-00` lands deferred centralize-config
work on top of the merged auth feature.

## Layout

| Package / App     | Dir                 | Notes                                                                                            |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------ |
| `apps/api`        | `apps/api`          | NestJS 11 (CommonJS) REST API — global prefix `api/v1` (health excluded), `@/*` → `src/*`        |
| `apps/web`        | `apps/web`          | Next.js 16 + React 19 + Tailwind 4 (CSS-first via `@tailwindcss/postcss`), `@/*` → `./*`         |
| `@opero/config`   | `packages/config`   | **Real workspace package** — Joi `envSchema`, `validateEnv`, `AppEnv` type, `DEFAULT_WEB_ORIGIN` |
| `@opero/database` | `packages/database` | Prisma 7 client + 6 RBAC models, barrel re-exports `PrismaClient`/`Prisma`/`PrismaPg`            |

## Env flow

- **Schema**: 6 vars (`NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET` min 32,
  `JWT_EXPIRES_IN` default `15m`, `CORS_ORIGIN` default `http://localhost:3000`).
  `NEXT_PUBLIC_API_URL` is NOT in this schema — it's a web-only public var.

- **`apps/api`**: `config.module.ts` passes `envSchema` (from `@opero/config`) to
  `ConfigModule.forRoot({ validationSchema })`. All runtime reads go through
  `ConfigService.getOrThrow()`. `main.ts` uses `app.get(ConfigService)` + `getOrThrow`
  — **not** raw `process.env`.

- **`packages/database`**: `prisma.config.ts` and `seed.ts` call
  `validateDatabaseEnv(process.env)` from `@opero/config` and use `DATABASE_URL`
  — the only env var the package ever reads.

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

## UI Component Guidelines

- When creating a new UI component in `apps/web`, follow the **Atomic Design methodology** where practical:
  - **Atoms** — small, reusable UI primitives such as buttons, inputs, labels, icons, badges, etc.
  - **Molecules** — combinations of atoms that form a small reusable UI unit, such as a search field or form field.
  - **Organisms** — larger reusable sections composed of atoms and molecules, such as a navbar, sidebar, or data table.
  - **Templates** — page-level layouts that define the structure and placement of organisms without containing page-specific data or business logic.
  - **Pages** — actual routes/screens that compose templates and provide page-specific data, state, and business logic.
- shadcn/ui primitives live in `app/components/ui/*` as **base only**. Atoms in `app/components/atoms/*` wrap/import `ui` and are the **single source of truth** for customization. Application code imports atoms rather than `ui` directly. Create an atom wrapper before using a primitive without one. Do not delete existing atom wrappers (e.g. `atoms/card` when present) without explicit approval.
- Prefer composing existing components over creating duplicated UI primitives.
- Keep components reusable and composable rather than coupling them tightly to a single page or feature.
- Templates should handle **layout and composition**, while pages should handle **data fetching, business logic, and route-specific behavior**.
- Follow the existing project conventions for component location, naming, styling, and exports.
- When extending a shadcn/ui component, preserve its existing accessibility and composability patterns.

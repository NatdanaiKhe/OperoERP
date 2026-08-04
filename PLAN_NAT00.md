# PLAN_NAT00 — Land all deferred (non-lost) work on `feature/NAT-00`

> Draft only. No code, no branch, no commits executed. This document is the
> step-by-step plan to be followed when the branch is created.

## Goal

Land every recoverable deferred item from `DEFERRED.md` onto a single branch
`feature/NAT-00`, committed as one Conventional-Commits-sized change per
deferred bucket, in dependency order. Each commit must be independently
verifiable with the commit's own verification block plus the application of all
prior commits.

Starting state (ground truth, accepted as-is):

- Branch `main`, HEAD `50de74e feat(auth): add JWT authentication and RBAC`.
- Working tree CLEAN (no untracked, no modified).
- `_`Auth feature already merged into `main`._ Deferred items are config/build/
  docs/test/hygiene only — no changes to auth or health behavior.

## Success Criteria (branch-level)

1. `git log main..feature/NAT-00` shows exactly 7 (or 8 if commit 8 lands)
   commits, each with the exact Conventional-Commits subject listed below.
2. Every per-commit verification block in this plan passes at its own commit
   (with prior commits applied).
3. No commit re-introduces a known-bad artifact:
   - No `apps/api/test/app.e2e-spec.ts` health test (commit 7 adds a REAL auth
     e2e instead).
   - No raw `process.env` reads in `apps/api/src/main.ts` (it already uses
     `ConfigService.getOrThrow` — leave it).
   - No broken `jest-e2e.json` `@/` mapper that resolves to a non-existent
     `src/` dir (commit 7 corrects it).
4. The full verification block (end of plan) passes at `feature/NAT-00` HEAD.
5. `apps/web/**` and `REQUIREMENT.md` are untouched.

## Out of Scope (explicitly dropped)

| Item                                                                                           | Reason                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/**` working-tree UI/style edits                                                      | Not recoverable from git; prior inventory confirmed gone.                                                                                                                                                            |
| `REQUIREMENT.md` modifications                                                                 | Not recoverable from git; prior inventory confirmed gone.                                                                                                                                                            |
| The original (lost) `AGENTS.md` / `LOG.md` / `PLAN.md` / `PLAN_AUTH.md` / `.env.example` files | Only ever existed as untracked/gone; rebuilt fresh in commit 5.                                                                                                                                                      |
| `apps/api/test/app.e2e-spec.ts` health test                                                    | Superseded by commit 7's real auth e2e.                                                                                                                                                                              |
| Any `NEXT_PUBLIC_API_URL` in `@opero/config`                                                   | Web's public env var lives elsewhere (see `DEFERRED.md`); intentionally excluded. The `@opero/config` canonical schema is the **6** api/database vars, matching the auth-branch `apps/api/src/config/env.schema.ts`. |

> Note: `DEFERRED.md` describes `.env.example` as a "7-var reference". That line
> is **stale** — it predates the decision to keep `NEXT_PUBLIC_API_URL` out of
> the centralized schema. The plan standardizes on **6 vars** (the 6 already
> present in `apps/api/.env.example` on `main`). This is a deliberate change
> from the original deferred list, recorded here.

## Commit order & subjects

1. `feat(config): add @opero/config package with env schema, defaults, and loaders`
2. `chore(turbo,db): add db:* tasks, database#typecheck, @opero/config build dep + validateEnv`
3. `chore(format): centralize prettier config at repo root; remove apps/api/.prettierrc`
4. `feat(api): add LoggingInterceptor for request/response logging`
5. `docs: add PLAN/PLAN_AUTH/LOG + canonical .env.example; cleanup api README`
6. `chore(api): remove redundant joi/dotenv from apps/api/package.json`
7. `test(api): add real authentication e2e specification`
8. _(optional)_ `chore(api): dedupe jest moduleNameMapper and add trailing newline`

---

## Commit 1 — `feat(config): add @opero/config package with env schema, defaults, and loaders`

**Intent:** Make `@opero/config` the canonical home for env validation across
the monorepo. The Joi schema content is **identical** to the current inline
`apps/api/src/config/env.schema.ts` — this commit only moves the source of
truth, it does NOT change schema behavior.

**Depends on:** none (first commit).

**Files to CREATE:**

- `packages/config/package.json`
  - `name: "@opero/config"`, `version`, `private: true`, `license`.
  - `main: "dist/index.js"`, `types: "dist/index.d.ts"`.
  - `scripts`: `build: "tsc -p tsconfig.json"`, `typecheck: "tsc --noEmit -p tsconfig.json"`.
  - `dependencies`: `{ "joi": "^17.13.3" }` (same joi version `apps/api` currently uses).
- `packages/config/tsconfig.json`
  - `extends: "../../tsconfig.json"`.
  - `compilerOptions`: **`module: "commonjs"`, `moduleResolution: "node"`** (NOT inherited ESNext/Bundler), `outDir: "dist"`, `rootDir: "src"`, `declaration: true`.
  - `include: ["src/**/*.ts"]`.
  - **Rationale / deviation note:** The brief said "matches the database package". The actual `packages/database/tsconfig.json` does NOT set `module`/`moduleResolution` — it inherits root's `ESNext`/`Bundler`. But `@opero/config` MUST emit CJS because its `main` points at `dist/index.js` and it is `require()`-ed at runtime by the CJS `apps/api` (nest build → CJS). So config uses `commonjs`/`node` on its own merits. This is the correct choice; flag it as a deliberate divergence from the literal "matches database" wording.
- `packages/config/.env.example`
  - The 6 vars: `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN` — mirror `apps/api/.env.example` values.
- `packages/config/src/index.ts`
  - Barrel: re-export `envSchema`, `ENV_VARIABLES`, `validateEnv`, `DEFAULT_WEB_ORIGIN`, `DEFAULT_API_BASE_URL`, and `type AppEnv`.
- `packages/config/src/env.schema.ts`
  - `import * as Joi from 'joi'`.
  - `envSchema = Joi.object({...})` — **copy the 6 keys verbatim** from the current `apps/api/src/config/env.schema.ts` (NODE_ENV valid dev/prod/test default development; PORT int 1-65535 default 4000; DATABASE_URL uri required; JWT_SECRET min 32 required; JWT_EXPIRES_IN default '15m'; CORS_ORIGIN default = `DEFAULT_WEB_ORIGIN`).
  - Replace the inline `CORS_ORIGIN` default string with the imported `DEFAULT_WEB_ORIGIN` constant.
  - `ENV_VARIABLES` — array of the 6 key names (string[]).
  - Doc comment: `NEXT_PUBLIC_API_URL` is intentionally NOT here (web's public var; see `DEFERRED.md`).
- `packages/config/src/env.ts`
  - `validateEnv(env: NodeJS.ProcessEnv = process.env): AppEnv` — framework-agnostic loader. Calls `envSchema.validate(env, { allowUnknown: true, abortEarly: true })`; throws on error (let Joi error propagate, or wrap in a typed Error). Returns the validated + defaulted value cast to `AppEnv`.
- `packages/config/src/defaults.ts`
  - `export const DEFAULT_WEB_ORIGIN = 'http://localhost:3000'`
  - `export const DEFAULT_API_BASE_URL = 'http://localhost:4000/api/v1'`
- `packages/config/src/types.ts`
  - `export interface AppEnv` — typed shape of the validated env: `NODE_ENV`, `PORT: number`, `DATABASE_URL: string`, `JWT_SECRET: string`, `JWT_EXPIRES_IN: string`, `CORS_ORIGIN: string`.

**Files to EDIT:**

- `apps/api/package.json`
  - Add `"@opero/config": "workspace:*"` to `dependencies` (alphabetical; keep `joi`/`dotenv` here for now — they are removed in commit 6).
- `apps/api/src/config/config.module.ts`
  - Change `import { envSchema } from './env.schema'` → `import { envSchema } from '@opero/config'`.
  - All other lines unchanged (Nest `ConfigModule.forRoot` with `validationSchema: envSchema`, `validationOptions: { allowUnknown: true, abortEarly: true }`).

**Files to DELETE:**

- `apps/api/src/config/env.schema.ts` — superseded by `@opero/config`. Confirm no other file imports it (only `config.module.ts` did).

**Verification (run after commit 1):**

```bash
yarn install                                        # links @opero/config workspace
yarn workspace @opero/config build                  # produces packages/config/dist/index.js
ls packages/config/dist/index.js                   # confirm exists
yarn typecheck                                     # api resolves @opero/config; schema identical → passes
yarn lint
yarn workspace api test                             # unit tests still green (schema unchanged)
```

Pass = `packages/config/dist/index.js` exists, and `typecheck`/`lint`/unit tests all pass. The app's env validation behavior is unchanged (same 6 keys, same defaults).

---

## Commit 2 — `chore(turbo,db): add db:* tasks, database#typecheck, @opero/config build dep + validateEnv`

**Intent:** Centralize the database env path onto `@opero/config#validateEnv`
and add turbo hygiene (`db:*` tasks, `database#typecheck`, build ordering).

**Depends on:** Commit 1 (`@opero/config` must exist and build before this
package's seed/config/typecheck can run).

**Files to EDIT:**

- `packages/database/package.json`
  - Add `"@opero/config": "workspace:*"` to `dependencies`.
  - Add `"typecheck": "tsc --noEmit -p tsconfig.json"` to `scripts`.
- `packages/database/prisma.config.ts`
  - Keep `import 'dotenv/config'` (Prisma CLI needs `.env` loaded before `validateEnv` reads `process.env`).
  - Add `import { validateEnv } from '@opero/config'`.
  - Replace `datasource.url: process.env["DATABASE_URL"]` → `const appEnv = validateEnv(process.env); ... datasource: { url: appEnv.DATABASE_URL }`.
- `packages/database/prisma/seed.ts`
  - Keep `import 'dotenv/config'`.
  - Add `import { validateEnv } from '@opero/config'`.
  - `const appEnv = validateEnv(process.env);`
  - Replace `process.env.DATABASE_URL!` (used in `new PrismaPg({ connectionString: ... })`) → `appEnv.DATABASE_URL`.
- `turbo.json` — add/modify tasks:
  - `db:generate`: add `"dependsOn": ["@opero/config#build"]` (keep existing `outputs: ["node_modules/.prisma/client/**"]`).
  - `db:migrate`: keep `cache: false`, `env: ["DATABASE_URL"]`, add `"dependsOn": ["@opero/config#build"]`.
  - **Add** `db:migrate-dev`: `{ "cache": false, "env": ["DATABASE_URL"], "dependsOn": ["@opero/config#build"] }`.
  - **Add** `db:deploy`: `{ "cache": false, "env": ["DATABASE_URL"], "dependsOn": ["@opero/config#build"] }`.
  - **Add** `db:seed`: `{ "cache": false, "env": ["DATABASE_URL"], "dependsOn": ["@opero/config#build"] }`.
  - `typecheck`: keep `dependsOn: ["^typecheck"]`. **Add** a cross-task pin so the database's typecheck runs after the Prisma client is generated: extend `dependsOn` with `"packages/database#db:generate"` (i.e. `dependsOn: ["^typecheck", "packages/database#db:generate"]`). Rationale: `packages/database/src/index.ts` re-exports from `generated/prisma/client`, so `tsc --noEmit` needs the generated client present.

**Files to CREATE:** none.

**Caveat to document in commit body:** For direct (non-turbo) invocations
(e.g. `yarn workspace database db:seed`), `@opero/config`'s `dist/` must be
built once beforehand: `yarn workspace @opero/config build`. Turbo-driven runs
(`yarn turbo db:seed`, `yarn turbo build`) handle this automatically via the
`dependsOn` added here.

**Verification (run after commit 2):**

```bash
yarn workspace @opero/config build                  # prerequisite for direct db invocations
yarn turbo db:generate                             # @opero/config build runs first (turbo dependsOn)
yarn typecheck                                     # now includes packages/database typecheck
yarn lint
yarn workspace api test                            # still green
# Optionally (requires live DB): yarn turbo db:seed  — confirm it resolves appEnv.DATABASE_URL
```

Pass = `turbo db:generate` succeeds with `@opero/config#build` in the pipeline; `typecheck` now covers the database package; no lint/test regressions.

---

## Commit 3 — `chore(format): centralize prettier config at repo root; remove apps/api/.prettierrc`

**Intent:** Single source of prettier config at repo root.

**Depends on:** none strictly, but lands after commit 2 for a clean diff.

**Files to CREATE:**

- Root `.prettierrc` — `{ "singleQuote": true, "trailingComma": "all" }` (mirror current `apps/api/.prettierrc` content exactly).

**Files to DELETE:**

- `apps/api/.prettierrc`.

**Files to EDIT (post-format normalization):**

- Run `yarn format` after the create+delete. If any source files change formatting (unlikely since content matches), include those reformatted files in this same commit. Expect only the two config-file changes; if other diffs appear, they belong here too.

**Verification (run after commit 3):**

```bash
yarn format                                         # idempotent — no further diffs
git diff --stat HEAD~1 HEAD                          # only intended files (root .prettierrc added, apps/api/.prettierrc removed, +/- any normalization)
yarn lint
yarn typecheck
```

Pass = `yarn format` produces no further changes; `lint`/`typecheck` clean.

---

## Commit 4 — `feat(api): add LoggingInterceptor for request/response logging`

**Intent:** Global request/response logging via a Nest interceptor. Pure
additive — no behavior change to auth/health.

**Depends on:** Commit 1 (api already imports `@opero/config`; interceptor
logging uses Nest `Logger`, no config dep, but ordering keeps it after the
config/format commits).

**Files to CREATE:**

- `apps/api/src/common/interceptors/logging.interceptor.ts`
  - Class `LoggingInterceptor implements NestInterceptor`.
  - Use `Logger` from `@nestjs/common` (NOT `console`). Per-class or context-named logger (e.g. `new Logger('LoggingInterceptor')` or `context` arg).
  - `intercept(context, next)`: read `context.switchToHttp().getRequest()` — log method + URL (request line). Use `next.handle().pipe(tap(() => { ... }))` — on response, log HTTP status code (`context.switchToHttp().getResponse().statusCode`) + duration (compute via `Date.now()` delta captured at request time). Handle the duration via a closure-captured start time.
  - No error-path handling beyond what `tap` already lets through; the global `AllExceptionsFilter` covers error responses.

**Files to EDIT:**

- `apps/api/src/app.module.ts`
  - Import `APP_INTERCEPTOR` from `@nestjs/core`.
  - Import `LoggingInterceptor` from `./common/interceptors/logging.interceptor`.
  - Add `{ provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }` to `providers` (alongside the existing `APP_GUARD` and `APP_FILTER`).

**Files to DELETE:** none.

**Verification (run after commit 4):**

```bash
yarn typecheck                                      # interceptor + app.module compile
yarn lint
yarn workspace api test                             # unit tests unaffected (interceptor is additive)
```

Pass = `typecheck`/`lint`/unit tests green. The interceptor wires into the global provider list; unit tests don't instantiate the full `AppModule` so they are unaffected.

---

## Commit 5 — `docs: add PLAN/PLAN_AUTH/LOG + canonical .env.example; cleanup api README`

**Intent:** Restore the lost documentation set, accurately this time, and
remove the stale ESM-incompatibility paragraph from the api README.

**Depends on:** Commits 1-4 (documents the post-commit-4 state —
`LoggingInterceptor` is now wired globally).

**Files to CREATE:**

- Root `PLAN.md` — concise restatement of the centralized-config plan executed in commits 1-3: why `@opero/config` exists, the 6-var schema, how api and database consume it, turbo db:* task wiring, prettier centralization.
- Root `PLAN_AUTH.md` — concise restatement of the already-merged auth plan (JWT access tokens, opaque hashed refresh tokens with rotation + reuse detection, bcrypt + `DUMMY_PASSWORD_HASH` timing equalizer, `JwtAuthGuard` global guard, `@Public` decorator, RBAC roles/permissions seeder).
- Root `LOG.md` — dev journal entry summarizing the full auth + config-hardening journey: what landed on the auth branch, what was deferred, and what this branch (NAT-00) lands.
- Root `.env.example` — canonical 6-var reference (same 6 as `@opero/config`). One value per line, with a header comment pointing to `packages/config/src/env.schema.ts` as the authoritative schema. Values mirror `apps/api/.env.example`.
- Root `AGENTS.md` — **accurate** repo guide for coding agents. Must include:
  - Monorepo layout: `apps/api` (Nest 11 CJS), `apps/web`, `packages/config` (real workspace package holding the Joi schema + `validateEnv`), `packages/database` (Prisma 7 client), `packages/shared`/`packages/ui` (empty/placeholder — confirm before asserting; do NOT claim they hold code they don't).
  - Env flow: **api** loads env via Nest `ConfigModule` with `validationSchema: envSchema` imported from `@opero/config` (`apps/api/src/config/config.module.ts`); **database** loads env via `validateEnv(process.env)` in `prisma.config.ts` and `prisma/seed.ts`. **`apps/api/src/main.ts` reads config via `ConfigService.getOrThrow` — NOT raw `process.env`.** Do not re-introduce the stale "main.ts reads process.env directly" claim.
  - Global wiring (post-commit-4 state): `APP_GUARD → JwtAuthGuard`, `APP_FILTER → AllExceptionsFilter`, `APP_INTERCEPTOR → LoggingInterceptor`, global prefix `api/v1` (health excluded), `ValidationPipe`, `cookie-parser`.
  - Path alias: `@/* → apps/api/src/*` (handle via tsconfig `paths` + jest mappers).
  - Commands: `yarn install`, `yarn build`, `yarn dev`, `yarn typecheck`, `yarn lint`, `yarn format`, `yarn turbo db:generate|db:migrate-dev|db:deploy|db:seed`, `yarn workspace api test|test:e2e`.

**Files to EDIT:**

- `apps/api/README.md` — surgically remove the "Database" section paragraph (lines 83-88) that claims the Prisma 7 client is ESM-only / cannot be imported without a build change. The whole "## Database" section currently only contains that stale paragraph; either remove the section header+body entirely or replace with a one-line pointer to `packages/database`. Prefer: remove the heading and the paragraph together to avoid leaving an empty section. Do NOT touch the rest of the README (Endpoints, Testing, Architecture notes, etc.).

**Files to DELETE:** none.

**Verification (run after commit 5):**

```bash
# No functional tests; confirm files exist and tooling still clean.
ls PLAN.md PLAN_AUTH.md LOG.md AGENTS.md .env.example   # all present
yarn lint
yarn typecheck
# Sanity: grep README.md for "import.meta.url"/"ESM" — zero hits after removal
```

Pass = all five docs exist; `apps/api/README.md` no longer contains the ESM-incompatibility claim; `lint`/`typecheck` clean.

---

## Commit 6 — `chore(api): remove redundant joi/dotenv from apps/api/package.json`

**Intent:** Remove direct `joi`/`dotenv` deps from `apps/api` now that
`@opero/config` provides joi (transitively) and `@nestjs/config` provides its
own dotenv.

**Depends on:** Commit 1 (`@opero/config` added to api deps, so joi remains
resolvable transitively).

**Pre-flight checks (MUST run before editing):**

```bash
rg "from ['\"]dotenv['\"]" apps/api/src                    # expect ZERO hits
rg "from ['\"]joi['\"]" apps/api/src                        # expect ZERO hits (schema moved in commit 1)
rg "from ['\"]joi['\"]" apps/api/test                       # expect ZERO hits
rg "@types/joi" apps/api                                    # check devDeps presence
```

**Files to EDIT:**

- `apps/api/package.json`
  - Remove `"joi"` from `dependencies` (only safe because zero `from 'joi'` hits remain post-commit-1).
  - Remove `"dotenv"` from `dependencies` (only safe because zero `from 'dotenv'` hits in `apps/api/src`; `@nestjs/config` brings its own dotenv).
  - If `@types/joi` exists in `devDependencies`: remove only if the pre-flight grep found zero joi usage anywhere under `apps/api` (including tests). If any hit, **keep** `@types/joi`.

**Files to DELETE:** none.

**Verification (run after commit 6):**

```bash
yarn install                                        # lockfile updates (joi/dotenv no longer direct api deps)
yarn typecheck                                      # MUST pass — proves joi still resolves transitively via @opero/config
yarn lint
yarn workspace api test                             # green
```

Pass = typecheck/lint/unit tests green with joi/dotenv removed from api's direct deps.

---

## Commit 7 — `test(api): add real authentication e2e specification`

**Intent:** Add a real e2e spec exercising the auth flow, DB-free via a
`PrismaService` mock. This replaces the deleted `app.e2e-spec.ts` health test.

**Depends on:** Commits 1-6 (full post-cleanup state). Specifically:

- The `@/` path alias and `database` workspace import must resolve under the
  e2e jest config.
- `LoggingInterceptor` (commit 4) is wired globally; the e2e `AppModule`
  instantiation will include it — harmless for tests.

**Critical infrastructure fix baked into this commit** (required for the spec
to even load `AppModule`):

- `apps/api/test/jest-e2e.json` currently maps `^@/(.*)$` → `<rootDir>/src/$1`
  with `rootDir: ".."` (repo root), which resolves `@/*` to a non-existent
  `<repoRoot>/src/` — **broken**. It also has **no** `^database$` mapper, so the
  `import { PrismaClient, PrismaPg } from 'database'` inside
  `prisma.service.ts` would fail to resolve at module load time. **Both must be
  fixed in this commit** (this is the "broken jest-e2e.json `@/` mapper" called
  out in cross-cutting concern #5).
  - `moduleNameMapper`: set `^@/(.*)$` → `<rootDir>/apps/api/src/$1`.
  - `moduleNameMapper`: add `^database$` → `<rootDir>/apps/api/test/mocks/database.ts` (reuse the existing mock the unit tests use).

**Files to CREATE:**

- `apps/api/test/auth.e2e-spec.ts`
  - Uses `@nestjs/testing` `Test.createTestingModule({ imports: [AppModule] })`, then **`app.overrideProvider(PrismaService).useValue({...})`** to inject a hand-rolled in-memory `PrismaService` mock (no live DB). Then `app.init()`.
  - Use `supertest` against `app.getHttpServer()`. **The test harness must `app.use(cookieParser())`** before `init()` OR rely on the global prefix already set in `main.ts` — note: `setGlobalPrefix` is applied in `main.ts`, NOT in `AppModule`, so the e2e harness must either call `app.setGlobalPrefix('api/v1', { exclude: ['health'] })` before `init()` OR the spec paths must include `/api/v1/auth/...` only if the prefix is set. Record this as a known harness wrinkle and set the prefix in `beforeAll` so request paths are `/api/v1/auth/...` (matching the real server).
  - Mock `PrismaService` at the provider level (`overrideProvider(PrismaService).useValue({...})`) returning an in-memory store object exposing the methods used by `AuthService`/`AuthController`: `user.findUnique`, `user.create`, `user.update`, `user.findUnique` (profile), `refreshToken.findUnique`, `refreshToken.create`, `refreshToken.updateMany`, plus `userRoles` relations. Provide just enough behavior to make each flow succeed/fail as the test asserts.
  - Cover:
    1. `POST /api/v1/auth/register` — valid `RegisterDto` → 201, `{ message: 'User registered successfully' }`. Assert the mock `user.create` was called.
    2. `POST /api/v1/auth/register` — duplicate email → mock `user.findUnique` returns a user → 409 Conflict.
    3. `POST /api/v1/auth/login` — valid creds (mock `user.findUnique` returns a hashed-password user; use `bcrypt.hash` in the mock setup) → 200, body `{ accessToken }`, and `Set-Cookie` contains the refresh cookie name (`refresh_token` per `cookie-options.ts`).
    4. `GET /api/v1/auth/profile` — with `Authorization: Bearer <access token from step 3>` → 200, returns user info (`id`, `email`, `username`, ...). Assert 401 without the bearer.
    5. `POST /api/v1/auth/refresh` — using the refresh cookie from step 3 → 200, new `{ accessToken }`. Assert a fresh access token is returned and refresh cookie is rotated (`Set-Cookie` present).
    6. `POST /api/v1/auth/logout` — with refresh cookie → 200, `{ message: 'Logged out successfully' }`, and `Set-Cookie` clears the refresh cookie (`Max-Age=0` / cleared).
  - Use the real `JwtService`/`ConfigModule` from `AppModule` for token signing/verifying (don't mock the JWT layer — that's the point of an e2e). Provide env via the harness: set `process.env` for the 6 vars (or rely on `apps/api/.env` — but prefer explicit `process.env` set in `beforeAll` with a valid 32+ char `JWT_SECRET`) so `ConfigModule` validation passes.

**Files to EDIT:**

- `apps/api/test/jest-e2e.json` — apply the two `moduleNameMapper` fixes above. Add `testEnvironment: "node"` (already present) and confirm `transform: ts-jest`, `testRegex: ".e2e-spec.ts$"` are intact.

**Files to DELETE:** none. Do NOT restore `apps/api/test/app.e2e-spec.ts`.

**Verification (run after commit 7):**

```bash
yarn workspace @opero/config build                  # ensure @opero/config dist present
yarn workspace api test:e2e                         # MUST pass — all 6 flow assertions green
yarn typecheck
yarn lint
```

Pass = `test:e2e` passes with the `PrismaService` mock; no live DB required. If the harness cannot construct `AppModule` without a real Prisma client being loaded (because `app.overrideProvider` runs after module instantiation), fall back to `overrideProvider(PrismaService).useValue({...})` applied BEFORE `compile()`/`init()` — this is the standard Nest e2e override pattern and avoids instantiating the real `PrismaService`. The `^database$` mock mapper is still required because `prisma.service.ts`'s top-level `import { PrismaClient, PrismaPg } from 'database'` is evaluated when the file is loaded regardless of provider override.

---

## Commit 8 — `chore(api): dedupe jest moduleNameMapper and add trailing newline` (OPTIONAL)

**Intent:** Apply the `stash@{0}` change that dedupes the duplicate
`moduleNameMapper` keys in `apps/api/package.json`'s jest block.

**Depends on:** Commits 1-7 (commits 1 & 6 already edited `apps/api/package.json`,
so the stash pop may conflict — see handling below).

**Note on the current state:** `apps/api/package.json` jest block
(lines 67-90) currently has **two** `moduleNameMapper` keys (lines 74-76 and
86-89). The second (with both `^@/(.*)$` and `^database$` mappers) overrides the
first. JSON duplicate keys are technically invalid; the dedupe collapses to a
single `moduleNameMapper` with both mappings. `testEnvironment: "node"` is
already present (line 85).

**Procedure:**

1. `git stash list` — confirm `stash@{0}` exists and inspect: `git stash show -p stash@{0}`.
2. `git stash pop` (or `git stash apply` for safety).
3. If pop succeeds cleanly: stage and commit.
4. If pop **conflicts** on `apps/api/package.json` (likely, since commits 1 & 6 touched it):
   - Manually resolve: keep a single `moduleNameMapper` object with both entries:
     ```json
     "moduleNameMapper": {
       "^@/(.*)$": "<rootDir>/$1",
       "^database$": "<rootDir>/../test/mocks/database.ts"
     }
     ```
   - Drop the redundant first `moduleNameMapper` block (lines 74-76).
   - Ensure `testEnvironment: "node"` present (it is).
   - Ensure the file ends with a single trailing newline (`\n`).
   - `git stash drop stash@{0}` after manual resolution (since the pop was abandoned/apply-resolved).

**Files to EDIT:** `apps/api/package.json` (jest block only). No other files.

**Verification (run after commit 8):**

```bash
yarn workspace api test                             # unit tests still pass (mapper equivalent, now de-duplicated)
yarn workspace api test:e2e                         # e2e still pass (commit 7's jest-e2e.json unaffected)
yarn lint
# Confirm: rg -n "moduleNameMapper" apps/api/package.json → exactly ONE occurrence
```

Pass = single `moduleNameMapper` key; both mappers preserved; unit + e2e green; trailing newline present.

---

## Cross-cutting concerns

### 1. Build order (`@opero/config` before api & database)

- `@opero/config` `main` → `dist/index.js` (CJS, per its tsconfig commonjs/node).
- `apps/api` (CJS, nest build) `require('@opero/config')` at runtime → needs `@opero/config#dist` built first.
- `packages/database` `prisma.config.ts`/`seed.ts` `import { validateEnv } from '@opero/config'` (run via `ts-node` from Prisma CLI) → resolve `@opero/config` through the workspace symlink to its `dist/index.js` → needs dist built first.
- Turbo coverage:
  - `apps/api` declares `"@opero/config": "workspace:*"` (commit 1) → `build` task's existing `dependsOn: ["^build"]` makes `@opero/config#build` run before `api#build`. No turbo.json change needed for api build ordering.
  - `packages/database` declares `"@opero/config": "workspace:*"` (commit 2) → same `^build` chain covers `database#build`. The `db:*` and `database#typecheck` tasks get explicit `dependsOn: ["@opero/config#build"]` (commit 2) because they are NOT covered by `^build` (they aren't the `build` task).
- For **direct** (non-turbo) invocations: `yarn workspace @opero/config build` must be run once before `yarn workspace api build`, `yarn workspace database db:seed`, etc. Recorded in commit 2's body.

### 2. Each commit independently verifiable

Every commit's verification block passes when run at that commit with prior
commits applied. No commit leaves the tree in a state where a prior
verification would newly fail.

### 3. No behavior changes to auth or health

- Commit 1: schema content byte-for-byte identical (only where `envSchema`
  comes from changes). Validation options unchanged
  (`allowUnknown: true, abortEarly: true`).
- Commit 4: pure additive global interceptor (logging only; no response
  mutation in `tap`).
- Commit 7: pure additive tests.
- Commits 2, 3, 5, 6, 8: config/build/docs/hygiene only.

### 4. `@opero/config` `dist/` lifecycle

- `dist/` is gitignored (`.gitignore` line 7: `dist/`).
- `yarn dev` (nest start --watch / ts-node) can resolve `@opero/config` TS via
  the workspace symlink for the dev path, but `yarn build` (nest build → CJS)
  requires the `dist/` artifact. Turbo handles this; manual builds need the
  one-time `@opero/config build`.
- The plan does NOT commit `dist/` artifacts.

### 5. Do not re-introduce old bugs

- No `apps/api/test/app.e2e-spec.ts` health test (commit 7 supersedes).
- No raw `process.env` in `apps/api/src/main.ts` (leave the existing
  `ConfigService.getOrThrow` version intact).
- No broken `jest-e2e.json` `@/` mapper (commit 7 corrects
  `<rootDir>/src/$1` → `<rootDir>/apps/api/src/$1` and adds the `^database$`
  mock mapper).
- No `NEXT_PUBLIC_API_URL` in the `@opero/config` schema.

### 6. Decisions changed from the original deferred list

- **`.env.example` is 6 vars, not 7.** `NEXT_PUBLIC_API_URL` is intentionally
  excluded from `@opero/config` (per `DEFERRED.md`'s own note). `DEFERRED.md`'s
  "7-var" line is stale; this plan standardizes on 6, matching
  `apps/api/.env.example` on `main`. Recorded above in Out of Scope and in
  Commit 1's schema content note.
- **`packages/config/tsconfig.json` uses `module: commonjs`/`moduleResolution:
node`** — NOT inherited ESNext/Bundler from root. The brief's "matches the
  database package" wording is imprecise (database's tsconfig actually inherits
  ESNext/Bundler). The config package needs CJS output to be `require()`-able by
  the CJS api at runtime. Documented in Commit 1.
- **`apps/web/**` and `REQUIREMENT.md` dropped** — not git-recoverable.
- Acknowledged pre-existing latent issue: `apps/api/package.json` has duplicate
  `moduleNameMapper` JSON keys (lines 74-76 vs 86-89). Commit 8 resolves it; it
  does not block commits 1-7 because the second key (correct) already wins.

---

## Full verification block (run at `feature/NAT-00` HEAD after commit 7, or 8 if landed)

```bash
# Build chain
yarn install
yarn workspace @opero/config build
yarn turbo db:generate

# Quality gates
yarn lint
yarn typecheck                # includes @opero/config and packages/database
yarn format                   # idempotent — no diffs after

# Tests
yarn workspace api test
yarn workspace api test:e2e    # commit 7 real auth e2e, DB-free

# Smoke (requires live Postgres + .env with the 6 vars)
# yarn dev                      # api boots, logs request/response via LoggingInterceptor
# yarn turbo db:seed            # RBAC seeder via validateEnv
```

**Branch-level pass criteria:**

- All gates green.
- `git log main..feature/NAT-00 --oneline` shows the 7 (or 8) commits in order
  with the exact subjects listed.
- `git diff main..feature/NAT-00 --stat apps/web REQUIREMENT.md` → empty (out
  of scope untouched).
- `rg "from ['\"]joi['\"]" apps/api/src` → 0 hits.
- `rg "from ['\"]dotenv['\"]" apps/api/src` → 0 hits.
- `rg "import.meta.url|ESM" apps/api/README.md` → 0 hits.
- `ls PLAN.md PLAN_AUTH.md LOG.md AGENTS.md .env.example packages/config/src/index.ts apps/api/src/common/interceptors/logging.interceptor.ts apps/api/test/auth.e2e-spec.ts` → all present.
- `! -f apps/api/test/app.e2e-spec.ts` → true (not restored).
- `! -f apps/api/src/config/env.schema.ts` → true (moved to `@opero/config`).
- `! -f apps/api/.prettierrc` → true (centralized to root).
- `ls .prettierrc` (root) → present.

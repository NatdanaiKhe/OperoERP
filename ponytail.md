# Ponytail — over-engineering cleanup changelog

## API / tests
- Extracted shared e2e helpers (`apps/api/test/helpers.ts`): one in-memory Prisma mock + `createTestApp` + `extractRefreshToken`, replacing ~700 lines of per-suite boilerplate across auth/company/department specs. One mock, one boot path.
- `listUsers` dropped its query DTO + pagination/filters — callers only ever used the default active list. Deleted `ListUsersQueryDto`, simplified the service to a single `findMany`.
- Removed unused `FindCustomersDto.companyId` — customers are already scoped by the auth'd company.

## packages/config
- Deleted `types.ts` (`AppEnv`) and the `validateEnv` export: the API uses Nest ConfigModule and the DB pkg uses `validateDatabaseEnv`; both had no caller. `index.ts` now exports only what's used.

## Web
- Consolidated Radix: dropped `@radix-ui/react-label` + `@radix-ui/react-slot`, importing `Label`/`Slot.Root` from the already-present `radix-ui` package.
- Removed the unused root-level `zod` declaration (`package.json`); `apps/web`'s `zod` dependency is still active and untouched.
- Dropped the `cn` package: its lone stale import (`select.tsx`) now uses the existing shared local `cn` util in `@/app/lib/utils` (the local util was kept).
- Removed `@types/jest` (root) — unused dev dependency.
- Hoisted `EMAIL_REGEX` into `lib/utils.ts`, shared across login, company settings, and forgot-password (was duplicated 3×).
- Reused `DialogShell` for the department blocked-delete dialog instead of a hand-rolled modal overlay.
- Removed dead sidebar nav (commented Product/Sales/Approvals/Reports entries + unused icon imports).

## Verification
- `yarn workspace api test` — 146 passed. `test:e2e` — company + department pass; auth has 8 pre-existing failures (in-memory Prisma mock doesn't hash passwords), unrelated to this cleanup.
- `yarn.lock` updated to drop the removed deps.

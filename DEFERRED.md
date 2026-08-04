# DEFERRED — Items held for future branches

These were intentionally dropped from `feature/NAT-6_authentication` to keep
it scoped to auth-only. Each will land on its own branch or alongside a
future feature where the context fits better.

- **Root `AGENTS.md` rewrite** — can be redone accurately later.
- **Root `LOG.md`** — dev journal entry for the auth work.
- **Root `.env.example`** — canonical 7-var reference.
- **`packages/config/**` (`@opero/config` package)** — future "centralize config" branch.
- **`packages/database` `typecheck` script + turbo cross-task `database#typecheck -> database#db:generate`** — future hygiene.
- **`turbo.json` `db:migrate-dev`/`db:deploy`/`db:seed` declarations + `dependsOn:["@opero/config#build"]`** — future "centralize config" branch.
- **`apps/api/README.md` ESM-incompatibility paragraph** — deferred cleanup.
- **Root `.prettierrc` centralization** — deferred.
- **Redundant `joi`/`dotenv` removal from `apps/api/package.json`** — deferred.
- **`apps/api/src/common/interceptors/logging.interceptor.ts`** — deferred for future logger branch.
- **`apps/api/test/app.e2e-spec.ts` health test** — deleted on this branch; real auth e2e to be added on future branch.
- **`apps/web/**` working-tree UI/style edits** — deferred for future web work (NOT auth).
- **`REQUIREMENT.md` modifications** — deferred.

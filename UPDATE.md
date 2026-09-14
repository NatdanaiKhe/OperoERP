# UPDATE — Fine-Grained Permissions in the Frontend + Permission-Based Route Protection

> Second pass (2026-09-14): focused cleanup separating menu access from
> fine-grained permission checks. See "Menu vs permission separation" below.

## What changed

`GET /auth/profile` now returns a `permissions: string[]` field (the OR-merge of
all permission names across the user's roles), and the web app uses it to gate
dashboard routes and the customer create/edit actions. Previously the frontend
only had `menuConfig` (menu-key visibility); now it has fine-grained
permission data and a matching `usePermission()` helper. The second pass added
the `usePermission()` hook (moved the superadmin bypass into it) and deleted
redundant page-level `menuConfig` gates.

## Files touched

- `apps/api/src/auth/auth.service.ts` — `loadProfile()` selects
  `rolePermissions → permission.name` (mirroring `PermissionsGuard`), OR-merges
  into a `Set`, and emits `permissions: [...]`. No cache/schema/endpoint change.
- `apps/api/src/auth/auth.service.spec.ts` — profile payload tests: OR-merge
  across roles, `[]` for no grants, `[]` for superadmin with no rows.
- `apps/api/test/helpers.ts` — mock Prisma user role shape gains
  `rolePermissions: []` (matches the new select so e2e profile calls resolve).
- `apps/api/test/auth.e2e-spec.ts` — profile e2e asserts `permissions` is an array.
- `bruno/Auth/Profile.yml` — after-response assertion that `permissions` is an array.
- `apps/web/app/features/auth/types.ts` — `Profile` gains `permissions: string[]`.
- `apps/web/app/features/auth/hooks.ts` — added `usePermission(...permissions)`
  (variadic, superadmin bypass, `{ allow, isLoading }`). `useCanAccess` is
  untouched.
- `apps/web/app/dashboard/layout.tsx` — central route guard driven by a static
  `prefix → permission` map; renders an in-place "Access denied" state. Now
  consumes `usePermission` (the inline superadmin check is gone — bypass lives
  in one place).
- `apps/web/app/dashboard/customers/new/page.tsx` — action gate switched from
  `useCanAccess` to `usePermission('customer:create')`.
- `apps/web/app/dashboard/customers/[id]/edit/page.tsx` — action gate switched
  from `useCanAccess` to `usePermission('customer:update')`.
- `apps/web/app/dashboard/users/page.tsx` — removed the hand-rolled
  `menuConfig.includes('user_management')` + redirect gate.
- `apps/web/app/dashboard/departments/page.tsx` — removed the hand-rolled
  `menuConfig.includes('department_management')` + redirect gate.
- `apps/web/app/dashboard/customers/page.tsx` — removed the
  `useCanAccess('customers')` + redirect gate.

## API contract

- Additive field only: `permissions: string[]` on `GET /auth/profile`.
  Existing consumers are unaffected; the field is always present.
- The profile rides the existing `profile:{userId}` 30s TTL cache entry, so
  role/permission changes propagate in ≤30s (same staleness as `menuConfig`).
  The API still 403s any request the moment the grant is revoked.

## Rationale

- API stays the real security boundary: every guarded endpoint is already
  behind `JwtAuthGuard` + `RolesGuard` + `PermissionsGuard`. Client gating is
  UX only.
- Exposing the permission union (rather than routing on `menuConfig`) lets the
  frontend gate on the same names the API enforces, instead of inventing a
  parallel menu-key mapping.
- `menuConfig`/`useCanAccess` remain for sidebar visibility and the two
  settings menuKeys (`company_settings`, `menu_visibility`) which have no
  permission equivalent. This is deliberate — two sources: menuKey for nav,
  permission for gates. Revisit a shared registry only if adding a domain
  forces touching both and it hurts.

## Menu vs permission separation

Two gating sources, one concern each:

- **`useCanAccess(menuKey)`** → menu **presentation** only: sidebar links and
  settings tabs. Backed by `profile.menuConfig`.
- **`usePermission(...permissions)`** → routes and actions. Backed by
  `profile.permissions` + superadmin bypass, mirroring `PermissionsGuard`.

The second pass removed the page-level `menuConfig`/`useCanAccess` gates from
`users`, `departments`, and `customers` because they double-gated on a
_different_ source than the layout: a role holding `user:read` but lacking the
`user_management` menuKey was redirected off a page the layout deliberately
allowed. The layout route guard is now the single route gate; pages only add
action gates (`customer:create` / `customer:update`) where a mutation is in
play. Consequence (intended, not a bug): a user with the permission but no
menuKey sees no sidebar link yet can still deep-link the page.

## Superadmin behavior

- Server does **not** special-case superadmin in the payload: it returns
  whatever `RolePermission` rows exist (possibly `[]`).
- Client mirrors `PermissionsGuard` line 42: `usePermission` bypasses
  permission checks when the profile has a `superadmin` role. That bypass now
  lives in exactly one place (`usePermission`); the layout consumes it via the
  hook rather than re-implementing the check inline.
- `menuConfig` visibility (sidebar) still requires seeded `MenuVisibility`
  rows; that behavior is unchanged.

## Route guard map

| Path                                 | Required permission |
| ------------------------------------ | ------------------- |
| `/dashboard/users` (+subpaths)       | `user:read`         |
| `/dashboard/departments` (+subpaths) | `department:read`   |
| `/dashboard/customers` (+subpaths)   | `customer:read`     |

Longest-prefix match; no entry = allow. While profile loads → render `null`
(no redirect, no deny). Denied → in-place "Access denied" state, never logout.

## How to verify

```bash
yarn workspace api test                 # unit tests (OR-merge, no-grants, superadmin)
yarn workspace api test:e2e             # e2e profile payload
yarn typecheck                          # turbo typecheck (api + web + packages)
yarn lint                               # turbo eslint
yarn build                              # full monorepo build (web needs NEXT_PUBLIC_API_URL)
```

Manual (two seeded users — one superadmin, one restricted):

1. Restricted user (no `customer:read`): deep-link `/dashboard/customers` →
   "Access denied", no data fetch, no logout.
2. Same user with the grant → page renders as before.
3. Restricted user **with** `customer:read` but without the `customers`
   menuKey → page renders via deep-link; sidebar link still hidden.
4. User with `customer:read` but not `customer:create` →
   `/dashboard/customers` renders; `/dashboard/customers/new` redirects to
   `/dashboard`.
5. Superadmin → everything reachable regardless of seeded rows.
6. Unauthenticated → `/login` (unchanged). `/dashboard` and unlisted routes
   behave exactly as before.

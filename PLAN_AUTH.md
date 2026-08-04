# PLAN — Authentication (`feature/NAT-6_authentication`, merged to `main`)

## Token strategy

- **Access tokens** — short-lived JWT (signed via `@nestjs/jwt`, `JWT_SECRET` + `JWT_EXPIRES_IN`
  from config). Payload: `{ sub: userId, roles: string[] }`.
- **Refresh tokens** — opaque 40-byte hex string, SHA-256 hashed before storage,
  30-day TTL. Stored in the `RefreshToken` table with `revokedAt` for reuse detection.

## Refresh token rotation & reuse detection

- On refresh, the old token is atomically revoked (`updateMany` with `WHERE revokedAt IS NULL`).
  If the `updateMany` affects zero rows, the token was already rotated — this is a **reuse**
  event, which indicates compromise. The system immediately **revokes all sessions** for that
  user (`revokeAllForUser`) and returns `401`.

## Registration, login & timing safety

- `bcrypt` (10 salt rounds) hashes passwords. On login, if the email is not found,
  `bcrypt.compare(password, DUMMY_PASSWORD_HASH)` is called before returning `401`.
  `DUMMY_PASSWORD_HASH` is a one-time bcrypt hash of the literal string
  `"timing-equalizer"` — this equalizes response timing so attackers cannot
  distinguish "valid email" from "invalid email" by timing side-channel.
- New registrations are auto-assigned the `user` role via `UserRole` join.

## RBAC data model

Six models in the Prisma schema: `User`, `Role`, `Permission`, `UserRole`,
`RolePermission`, `RefreshToken`. The 182-line seeder (`packages/database/prisma/seed.ts`)
creates ~44 permissions, 3 roles (`user` / `manager` / `admin`), and wires them
together via `RolePermission` — all idempotent via upserts.

## Guard strategy

- `JwtAuthGuard` is registered as the **global default** (`APP_GUARD`).
  Every route requires authentication unless explicitly opted out with `@Public()`.
- `@Public()` is a custom decorator + metadata that the guard checks via
  `Reflector.getAllAndOverride('isPublic', …)`.

## Routes

All under `/api/v1/auth`:

| Method | Path        | Auth required | Description           |
| ------ | ----------- | ------------- | --------------------- |
| POST   | `/register` | public        | Create account + role |
| POST   | `/login`    | public        | Issue token pair      |
| POST   | `/refresh`  | public        | Rotate refresh token  |
| POST   | `/logout`   | public        | Revoke refresh token  |
| GET    | `/profile`  | authenticated | Current user info     |

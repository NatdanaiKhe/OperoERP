# OperoERP API

> Backend REST API for [OperoERP](../../README.md) — a small-business ERP/CRM platform.

Built with [NestJS](https://nestjs.com) 11 and served as part of the OperoERP monorepo
(architected as a modular monolith). The API currently exposes a health-check endpoint
and is the foundation for the CRM / Sales / etc. feature modules.

## Stack

- [NestJS](https://nestjs.com) 11 — framework
- [Terminus](https://docs.nestjs.com/terminus) — health checks
- [`pg`](https://node-postgres.com/) — PostgreSQL driver (see [Database](#database))
- [Jest](https://jestjs.io) — unit & e2e tests

## Getting started

### Prerequisites

- Node.js ≥ 20
- [Yarn 4](https://yarnpkg.com/getting-started/install)

### Install

Dependencies are managed at the monorepo root:

```bash
yarn install
```

### Environment

The API loads `.env` from this directory via `dotenv/config` on startup:

| Variable       | Default | Description                             |
| -------------- | ------- | --------------------------------------- |
| `PORT`         | `4000`  | Port the API listens on                 |
| `DATABASE_URL` | —       | PostgreSQL connection string (optional) |

When `DATABASE_URL` is not set, the database health check reports as unavailable
gracefully instead of failing the app.

## Running the app

From the monorepo root:

```bash
yarn workspace api dev       # watch mode
yarn workspace api build     # compile to dist/
yarn workspace api start     # run
yarn workspace api prod      # node dist/main.js
```

Or run the whole stack with `yarn dev` at the monorepo root.

## Endpoints

The API is served under the global prefix `/api/v1` (the health endpoint is excluded):

| Method | Path      | Description                                        |
| ------ | --------- | -------------------------------------------------- |
| GET    | `/health` | Liveness/readiness — heap memory + DB connectivity |

Example:

```
GET /health
{
  "status": "ok",
  "info": { "self": { ... }, "database": { ... } },
  ...
}
```

## Testing

```bash
yarn workspace api test         # unit tests
yarn workspace api test:e2e     # e2e tests (test/jest-e2e.json)
yarn workspace api test:cov     # coverage
```

## Database

PostgreSQL access currently uses the `pg` driver directly. The Prisma 7 client in
`packages/database` generates ESM output (uses `import.meta.url`), which cannot be
imported from this CommonJS package without a build change — revisit once the API moves
to ESM or the schema sets `moduleFormat = "cjs"`.

## Architecture notes

- **Modular monolith** — new domains (CRM, Sales, …) are added as NestJS modules with
  explicit boundaries; modules interact through defined interfaces, not by reaching
  into each other's internals.
- **Status flows as state machines** — Quotation / Sales Order / Invoice transitions
  are modeled explicitly.
- **Audit logging** — `created_by` / `updated_by` / `updated_at` plus changelog tables
  as infrastructure.

See the [root README](../../README.md) and [`REQUIREMENT.md`](../../REQUIREMENT.md) for
product context and the roadmap.

## License

MIT © Natdanai Khemthong.

# OperoERP

> A modern, small-business **ERP + CRM** platform built as a full-stack modular monolith.

OperoERP helps small and medium businesses manage customers, sales, products, inventory,
purchasing, finance, and internal operations from one centralized platform — replacing
spreadsheets, disconnected tools, and manual processes.

> **Status:** Early-stage scaffold. MVP scope is defined in
> [`REQUIREMENT.md`](./REQUIREMENT.md). The web app and API are bootstrapped; feature
> modules (CRM, Sales, etc.) are in progress.

## 🎯 The Product

The MVP enables a small business to run the core commercial flow:

```
Customer → Quotation → Sales Order → Invoice → Payment
```

### MVP Features

- **Authentication** — login, registration, password management
- **Organization management** — company profile, departments, users
- **CRM — Customer management** — create/edit customers, view history, add notes
- **Product management** — SKU, category, cost/selling price, active status
- **Sales module**
  - **Quotation** → `Draft → Sent → Accepted / Rejected` (with discount, tax, PDF)
  - **Sales Order** → `Pending → Processing → Completed / Cancelled`
  - **Invoice** → `Draft → Issued → Paid / Overdue / Cancelled`
- **Dashboard** — customers, revenue, open quotations, pending invoices, recent activity

### Non-functional goals

- Role-based access control (enforced at UI **and** API level)
- Password hashing + audit logging
- Responsive UI
- Target: ~100 users, 10,000 customers, 100,000 transactions

See [`REQUIREMENT.md`](./REQUIREMENT.md) for the full PRD (problem statement, users,
scope, architecture direction, and roadmap).

## 🧱 Tech Stack

| Layer    | Technology                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------------------------- |
| Monorepo | [Turborepo](https://turbo.build) + [Yarn 4](https://yarnpkg.com) workspaces                                          |
| Frontend | [Next.js](https://nextjs.org) (App Router), [React](https://react.dev) 19, [Tailwind CSS](https://tailwindcss.com) 4 |
| Backend  | [NestJS](https://nestjs.com) 11 (REST API), Terminus health checks                                                   |
| Database | [PostgreSQL](https://www.postgresql.org) via [Prisma](https://www.prisma.io) 7                                       |
| Language | [TypeScript](https://www.typescriptlang.org) 5                                                                       |
| Tooling  | ESLint 9, Prettier, Jest                                                                                             |

## 📁 Monorepo Layout

```
OperoERP/
├── apps/
│   ├── web/          # Next.js frontend (App Router, React 19, Tailwind 4)
│   └── api/          # NestJS REST API (port 4000, /api/v1 prefix, health checks)
├── packages/
│   ├── database/     # Prisma 7 schema + generated client (PostgreSQL)
│   ├── config/       # (scaffolded) shared configuration
│   ├── shared/       # (scaffolded) shared types / utilities
│   └── ui/           # (scaffolded) shared UI components
├── REQUIREMENT.md    # Product requirements & scope (PRD)
└── turbo.json        # Turborepo pipeline config
```

### Architecture notes

- **Modular monolith** — a single deployable service with clear internal module
  boundaries (CRM, Sales, …) rather than microservices. Modules interact through
  defined interfaces.
- **Status flows as state machines** — Quotation / Sales Order / Invoice transitions
  are modeled explicitly (who can transition what, from which state, with what side
  effects).
- **Audit logging** — `created_by` / `updated_by` / `updated_at` plus changelog tables
  as infrastructure, not an afterthought.

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 20
- [Yarn 4](https://yarnpkg.com/getting-started/install) (`corepack enable`)
- PostgreSQL running locally (for database features)

### 1. Install dependencies

```bash
yarn install
```

### 2. Configure environment

```bash
# API — apps/api/.env
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/operoerp

# Web — apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

> `DATABASE_URL` is optional for now — the API health check degrades gracefully when
> it is not set.

### 3. Run the development servers

```bash
yarn dev
```

- **Web:** http://localhost:3000
- **API:** http://localhost:4000
- **Health check:** http://localhost:4000/health

### 4. Database (optional, for migrations)

```bash
yarn turbo db:generate   # generate Prisma client
yarn turbo db:migrate    # apply migrations (requires DATABASE_URL)
```

## 📜 Scripts

From the repo root (runs across all workspaces via Turborepo):

| Command          | Description                       |
| ---------------- | --------------------------------- |
| `yarn dev`       | Start all dev servers             |
| `yarn build`     | Build all packages/apps           |
| `yarn lint`      | Lint all workspaces               |
| `yarn typecheck` | Type-check all workspaces         |
| `yarn format`    | Format the codebase with Prettier |

Workspace-specific scripts (e.g. `yarn workspace api test`) run Jest unit/E2E tests for
the API.

## 🗺️ Roadmap

- **V1** — Inventory, purchasing, approvals, notifications
- **V2** — Finance (chart of accounts, AR/AP), advanced CRM (lead pipeline, forecast,
  activities), automation

Out of scope for MVP: full accounting, payroll, manufacturing, mobile app, AI features,
workflow builder, multi-company, advanced inventory.

## 📄 License

[MIT](./package.json) © Natdanai Khemthong.

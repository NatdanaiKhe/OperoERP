# OperoERP Web

> Frontend for [OperoERP](../../README.md) — a small-business ERP/CRM platform.

Built with [Next.js](https://nextjs.org) (App Router), [React](https://react.dev) 19 and
[Tailwind CSS](https://tailwindcss.com) 4. Part of the OperoERP Turborepo monorepo.

> ⚠️ This project uses a newer Next.js with breaking changes — APIs, conventions, and
> file structure may differ from older versions. Read the relevant guides in
> `node_modules/next/dist/docs/` before writing code (see `AGENTS.md`).

## Stack

- [Next.js](https://nextjs.org) 16 — App Router, `next dev --turbo`
- [React](https://react.dev) 19
- [Tailwind CSS](https://tailwindcss.com) 4 — via `@tailwindcss/postcss`
- [TypeScript](https://www.typescriptlang.org) 5

## Getting started

### Prerequisites

- Node.js ≥ 20
- [Yarn 4](https://yarnpkg.com/getting-started/install)

### Install & run

Dependencies are installed at the monorepo root:

```bash
yarn install
yarn dev     # starts the web (and API) dev servers
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

Create `apps/web/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

## Structure

```
app/
├── components/
│   ├── atoms/        # smallest UI primitives
│   ├── molecules/    # composed atoms
│   ├── organisms/    # composed molecules
│   └── templates/    # page-level layouts
├── features/
│   └── auth/         # auth feature (login / register)
└── lib/
    ├── api-client.ts # API client wrapper (NEXT_PUBLIC_API_URL)
    └── utils.ts      # shared utilities
```

The atomic-design component folders and feature folders are scaffolded; content is
filled in as feature modules land.

## Scripts

```bash
yarn workspace web dev        # next dev --turbo
yarn workspace web build      # production build
yarn workspace web lint       # eslint .
yarn workspace web typecheck  # tsc --noEmit
```

## License

MIT © Natdanai Khemthong.

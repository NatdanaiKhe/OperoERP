<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Component layering

- `app/components/ui/*` is stock shadcn source — never import it from pages/organisms/molecules/templates.
- App code imports only `atoms/*` or `molecules/*`. `atoms/*` wrap `ui/*` and own app default styles/props (label, textarea, table, tabs, select, button, input, card all have atom wrappers). `molecules/*` compose `atoms/*`.
- Enforced by `no-restricted-imports` (atoms are the only files allowed to import `ui/*`).

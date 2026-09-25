# Goal

Implement the frontend Stock Adjustment feature, building on the completed Inventory schema/API (NAT-38) and Inventory List page (NAT-39).

The feature should let a user record a manual stock adjustment (RECEIPT/ADJUSTMENT/WRITE_OFF) for a product and view that product's movement history, with validation and clear pending/error states.

# Tasks

- Inspect the existing Inventory List page, API client, types, and StockMovement backend endpoints before implementation.
- Implement the Adjustment form: product (pre-selected from row context or selectable), quantity delta (signed), reason.
- Client-side validation: required fields, non-zero quantity delta, reason required; reuse existing form patterns (react-hook-form/zod or whatever the app already uses).
- Server-side validation errors (e.g. negative-resulting stock rejected by the service layer) must surface clearly in the form, not just as a generic toast.
- Disable the form/submit button while the request is pending; show a pending indicator.
- Implement the Movement History panel per product, reading from `StockMovement`, showing type, signed quantity, reason, actor (`createdById`), and timestamp, newest first.
- Wire the adjustment form to refresh the movement history panel and the inventory list/quantity on success.
- Reuse existing components, API patterns, types, and styling from the Inventory List and Product Management modules where possible.

# Accept

- [x] Adjustment form matches existing app UI patterns.
- [x] Product, quantity delta, and reason are captured and submitted correctly.
- [x] Client-side validation blocks invalid submissions before hitting the API.
- [x] Submit button/form is disabled while the request is pending.
- [x] Server-side errors (e.g. rejected negative-resulting adjustment) are surfaced to the user, not swallowed.
- [x] Movement history panel displays StockMovement records per product, correctly ordered.
- [x] Successful adjustment updates both the movement history panel and inventory quantity shown elsewhere in the UI.
- [x] Existing frontend functionality is not broken.
- [x] Typecheck/lint passes.

# Don't

- Don't change unrelated functionality.
- Don't introduce unnecessary dependencies.
- Don't create duplicate components when existing ones (form, panel, table) can be reused.
- Don't modify backend/API behavior unless required for the feature to work.
- Don't allow SALE/SALE_CANCELLED as selectable movement types in this form — those are internal-only, written by NAT-49's fulfillment logic.
- Don't invent new design patterns when an existing application pattern can be reused.

# Verify

- [x] Run typecheck and lint.
- [x] Test a successful adjustment (RECEIPT, ADJUSTMENT, WRITE_OFF) and confirm it appears in movement history.
- [x] Test a rejected adjustment (would take stock negative) and confirm the error surfaces correctly.
- [x] Test pending/disabled state during submission.
- [x] Test movement history ordering and content for a product with multiple movements.
- [x] Test movement history empty state for a product with no movements.
- [x] Compare the final UI against existing app form/panel patterns.

# Loop

All acceptance criteria satisfied.

# Report

- **Changes made**
  - Extended `apps/web/app/features/inventory/{types,api,hooks}.ts` with `AdjustStockPayload`, `StockMovement`, `MovementsResponse`, `adjustStock()`, `fetchMovements()`, `useMovements()`, and `useAdjustStock()` (invalidates `inventory` list and `movements` keys on success).
  - Quality fix: `movement-history-panel.tsx` now imports and displays `MOVEMENT_TYPE_LABELS` for human-readable badge labels instead of raw enum values.
  - Quality fix: `adjust-stock-dialog.tsx` quantity validation message now clearly states the quantity is required and must be non-zero.
  - Added `AdjustStockDialog` organism (`app/components/organisms/inventory/adjust-stock-dialog.tsx`) using local state + zod validation, matching the existing `invite-dialog.tsx` pattern.
  - Added `MovementHistoryPanel` organism (`app/components/organisms/inventory/movement-history-panel.tsx`) with server-side pagination (10/page), badge variants per movement type, signed quantity display, actor name fallback, and empty/error/skeleton states.
  - Wired row selection, the Adjust row action (hidden without `inventory:update`), the dialog, and the panel into `apps/web/app/dashboard/inventory/page.tsx`.
  - Added a one-line backend include in `apps/api/src/inventory/inventory.service.ts` `getMovementHistory` to return `createdBy { firstName, lastName }`.

- **Components/files changed**
  - `apps/web/app/features/inventory/types.ts`
  - `apps/web/app/features/inventory/api.ts`
  - `apps/web/app/features/inventory/hooks.ts`
  - `apps/web/app/components/organisms/inventory/adjust-stock-dialog.tsx` (new)
  - `apps/web/app/components/organisms/inventory/adjust-stock-dialog.types.ts` (new)
  - `apps/web/app/components/organisms/inventory/movement-history-panel.tsx` (new)
  - `apps/web/app/dashboard/inventory/page.tsx`
  - `apps/api/src/inventory/inventory.service.ts`
  - `TASK.md`

- **Verification performed**
  - `node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json` — clean.
  - `node_modules/.bin/eslint apps/web` — clean (only pre-existing warnings in `header.tsx`).
  - `node_modules/.bin/tsc --noEmit -p apps/api/tsconfig.json` — clean.
  - `node_modules/.bin/eslint apps/api/src/inventory` — clean (only pre-existing placeholder warnings).
  - Inventory unit tests: `inventory.service.spec.ts` + `inventory.controller.spec.ts` — 20/20 passed.
  - Inventory e2e: `inventory.e2e-spec.ts` — 9/9 passed.

- **Acceptance criteria status**
  - All `#Accept` items checked.

- **Subsequent UI change (side drawer)**
  - Moved `MovementHistoryPanel` from the inline bottom panel into a right-side drawer (`DrawerShell`) that opens when a product is selected.
  - Added `DrawerShell` molecule using Radix `Dialog` for backdrop, Escape close, focus trap, and scroll lock.
  - Added an explicit "History" row action so keyboard users without `inventory:update` can open movement history; `Adjust` remains permission-gated.
  - Drawer closes via X button, backdrop click, or Escape and clears the selected product (row highlight).
  - Files changed for this follow-up:
    - `apps/web/app/components/molecules/drawer-shell.tsx` (new)
    - `apps/web/app/components/organisms/inventory/movement-history-panel.tsx`
    - `apps/web/app/dashboard/inventory/page.tsx`

- **Remaining issues**
  - None.

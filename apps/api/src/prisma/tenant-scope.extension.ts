import { getTenantContext } from './tenant-context';

/**
 * Models that carry both `companyId` and `deletedAt`.
 *
 * Role is deliberately excluded: `roles.service` and `PermissionsGuard` query
 * roles across/without a company (superadmin semantics), so scoping them would
 * break authorization. User has `deletedAt` but no `companyId`.
 */
export const TENANT_ONLY_MODELS = ['inventoryItem', 'stockMovement'] as const;

export const TENANT_SCOPED_MODELS = [
  'product',
  'productCategory',
  'unitOfMeasure',
  'customer',
  'department',
] as const;

/** Operations the extension injects `companyId` + `deletedAt` into. */
const SCOPED_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'count',
  'update',
  'updateMany',
]);

interface ScopeArgs {
  where?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

/**
 * Merge the active tenant + soft-delete filters into a scoped operation's
 * args. Injected values win over caller values (isolation over convenience).
 *
 * `findUnique`/`create`/`delete` are intentionally untouched: callers use
 * compound unique keys for those and `create` carries `companyId` as data.
 *
 * Exported pure so the jest Prisma mock can mirror the extension exactly.
 */
export function applyTenantOnlyScope<T extends ScopeArgs>(
  operation: string,
  args: T,
): T {
  if (!SCOPED_OPERATIONS.has(operation)) return args;
  const companyId = getTenantContext()?.companyId;
  if (!companyId) return args;
  return { ...args, where: { ...(args?.where ?? {}), companyId } };
}

export function applyTenantScope<T extends ScopeArgs>(
  operation: string,
  args: T,
): T {
  if (!SCOPED_OPERATIONS.has(operation)) return args;

  const where: Record<string, unknown> = { ...(args?.where ?? {}) };

  const companyId = getTenantContext()?.companyId;
  if (companyId) where.companyId = companyId;

  // Restoring a soft-deleted row (`data.deletedAt = null`) must target a row
  // that IS deleted; every other write targets a live row. This is what stops
  // a second soft-delete from re-stamping `deletedAt`.
  const restoring = args?.data?.deletedAt === null;
  where.deletedAt = restoring ? { not: null } : null;

  return { ...args, where };
}

function modelExtension() {
  return {
    $allOperations: ({
      operation,
      args,
      query,
    }: {
      operation: string;
      args: ScopeArgs;
      query: (args: ScopeArgs) => Promise<unknown>;
    }) => query(applyTenantScope(operation, args ?? {})),
  };
}

function tenantOnlyModelExtension() {
  return {
    $allOperations: ({
      operation,
      args,
      query,
    }: {
      operation: string;
      args: ScopeArgs;
      query: (args: ScopeArgs) => Promise<unknown>;
    }) => query(applyTenantOnlyScope(operation, args ?? {})),
  };
}

/**
 * Prisma client extension: tenant-scoping + soft-delete filtering for every
 * model in `TENANT_SCOPED_MODELS`.
 *
 * Fail-open on missing tenant context (`companyId` undefined): superadmin
 * requests without a company and non-request paths (bootstrap/seed) stay
 * unscoped. Soft-delete filtering always applies.
 *
 * ponytail: fail-open is the superadmin escape hatch; if a public route ever
 * reaches a tenant-scoped model, switch that path to fail-closed.
 */
export const tenantScopeExtension = {
  name: 'tenantScope',
  query: {
    ...Object.fromEntries(
      TENANT_SCOPED_MODELS.map((model) => [model, modelExtension()]),
    ),
    ...Object.fromEntries(
      TENANT_ONLY_MODELS.map((model) => [model, tenantOnlyModelExtension()]),
    ),
  },
};

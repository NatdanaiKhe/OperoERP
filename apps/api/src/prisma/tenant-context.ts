import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Request-scoped tenant identity. Populated by `TenantContextInterceptor`
 * from the JWT payload (`req.user.companyId`) — the same single source of
 * truth the controllers used to pass down by hand.
 */
export interface TenantContext {
  companyId?: string;
}

const storage = new AsyncLocalStorage<TenantContext>();

/** Active tenant, or `undefined` outside a request (bootstrap, seeds, tests). */
export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

/** Run `fn` with `context` active for its whole async scope. */
export function runWithTenantContext<T>(
  context: TenantContext,
  fn: () => T,
): T {
  return storage.run(context, fn);
}

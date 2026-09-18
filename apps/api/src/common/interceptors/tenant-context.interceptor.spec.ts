import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { TenantContextInterceptor } from './tenant-context.interceptor';
import { getTenantContext } from '@/prisma/tenant-context';

const contextFor = (user?: unknown): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

const handler = (): CallHandler => ({
  handle: () =>
    of(getTenantContext()).pipe() as ReturnType<CallHandler['handle']>,
});

describe('TenantContextInterceptor', () => {
  const interceptor = new TenantContextInterceptor();

  it('exposes the JWT companyId to the handler', async () => {
    const seen = await lastValueFrom(
      interceptor.intercept(contextFor({ companyId: 'company-1' }), handler()),
    );
    expect(seen).toEqual({ companyId: 'company-1' });
  });

  it('treats a null companyId as unscoped', async () => {
    const seen = await lastValueFrom(
      interceptor.intercept(contextFor({ companyId: null }), handler()),
    );
    expect(seen).toEqual({ companyId: undefined });
  });

  it('treats a missing user (public route) as unscoped', async () => {
    const seen = await lastValueFrom(
      interceptor.intercept(contextFor(undefined), handler()),
    );
    expect(seen).toEqual({ companyId: undefined });
  });

  it('does not leak the tenant context past the request', async () => {
    await lastValueFrom(
      interceptor.intercept(contextFor({ companyId: 'company-1' }), handler()),
    );
    expect(getTenantContext()).toBeUndefined();
  });
});

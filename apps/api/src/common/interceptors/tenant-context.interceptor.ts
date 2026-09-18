import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { JwtPayload } from '@/common/decorators/current-user.decorator';
import { runWithTenantContext } from '@/prisma/tenant-context';

/**
 * Publishes the request's tenant (`req.user.companyId`) into the AsyncLocalStorage
 * consumed by the Prisma tenant-scope extension.
 *
 * Guards run before interceptors, so `JwtAuthGuard` has already populated
 * `req.user`. Public routes and company-less superadmins leave `companyId`
 * undefined → the extension fails open (unscoped), which is the intended
 * superadmin behavior.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const companyId =
      (req.user as JwtPayload | undefined)?.companyId ?? undefined;

    return new Observable((subscriber) => {
      runWithTenantContext({ companyId }, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}

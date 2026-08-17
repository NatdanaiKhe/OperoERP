import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { ROLES_KEY } from '@/common/decorators/roles.decorator';
import type { JwtPayload } from '@/common/decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // CRITICAL: skip @Public routes — JwtAuthGuard returns true without
    // setting req.user, so checking roles here would throw on undefined.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as
      | JwtPayload
      | undefined;

    if (!user || !user.roles || user.roles.length === 0) {
      throw new ForbiddenException('Insufficient role');
    }

    const hasRole = user.roles.some((r) => required.includes(r));
    if (!hasRole) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}

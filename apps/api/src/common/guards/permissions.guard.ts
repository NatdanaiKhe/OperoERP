import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { PERMISSIONS_KEY } from '@/common/decorators/permissions.decorator';
import type { JwtPayload } from '@/common/decorators/current-user.decorator';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // CRITICAL: skip @Public routes — JwtAuthGuard returns true without
    // setting req.user, so resolving permissions here would throw on undefined.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as
      JwtPayload | undefined;

    if (!user || !user.userId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (user.isSuperAdmin) return true;

    // Resolve role→permission per request (not from the JWT) so grants are
    // revocable without re-issuing tokens. Only permission names are fetched.
    const grantRows = await this.prisma.userRole.findMany({
      where: { userId: user.userId },
      select: {
        role: {
          select: {
            rolePermissions: {
              select: { permission: { select: { name: true } } },
            },
          },
        },
      },
    });

    const granted = new Set(
      grantRows.flatMap((ur) =>
        ur.role.rolePermissions.map((rp) => rp.permission.name),
      ),
    );

    const hasPermission = required.some((p) => granted.has(p));
    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

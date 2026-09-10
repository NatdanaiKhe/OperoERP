import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from '@/common/guards/permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: { userRole: { findMany: jest.Mock } };

  const mockContext = (user: unknown) =>
    ({
      getHandler: () => 'handler',
      getClass: () => 'class',
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  const grantRows = (names: string[]) =>
    names.map((name) => ({
      role: { rolePermissions: [{ permission: { name } }] },
    }));

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    prisma = { userRole: { findMany: jest.fn().mockResolvedValue([]) } };
    guard = new PermissionsGuard(reflector as never, prisma as never);
  });

  it('returns true for @Public routes', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true); // IS_PUBLIC_KEY
    await expect(guard.canActivate(mockContext(undefined))).resolves.toBe(true);
    expect(prisma.userRole.findMany).not.toHaveBeenCalled();
  });

  it('returns true when no @RequirePermissions metadata is set', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
      .mockReturnValueOnce(undefined); // PERMISSIONS_KEY
    await expect(guard.canActivate(mockContext(undefined))).resolves.toBe(true);
    expect(prisma.userRole.findMany).not.toHaveBeenCalled();
  });

  it('returns true when user.isSuperAdmin is true (bypass, no Prisma call)', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
      .mockReturnValueOnce(['customer:delete']); // PERMISSIONS_KEY
    await expect(
      guard.canActivate(
        mockContext({
          userId: 'u1',
          roles: ['superadmin'],
          companyId: 'company-1',
          isSuperAdmin: true,
        }),
      ),
    ).resolves.toBe(true);
    expect(prisma.userRole.findMany).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when the resolved set has none of the required names', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
      .mockReturnValueOnce(['customer:delete']); // PERMISSIONS_KEY
    prisma.userRole.findMany.mockResolvedValue(
      grantRows(['customer:read', 'customer:update']),
    );
    await expect(
      guard.canActivate(
        mockContext({
          userId: 'u1',
          roles: ['user'],
          companyId: 'company-1',
          isSuperAdmin: false,
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns true when the set contains a required permission (ANY semantics)', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
      .mockReturnValueOnce(['customer:create', 'customer:read']); // PERMISSIONS_KEY
    prisma.userRole.findMany.mockResolvedValue(
      grantRows(['customer:read', 'sale:read']),
    );
    await expect(
      guard.canActivate(
        mockContext({
          userId: 'u1',
          roles: ['user'],
          companyId: 'company-1',
          isSuperAdmin: false,
        }),
      ),
    ).resolves.toBe(true);
  });

  it('throws ForbiddenException when req.user is undefined (defensive)', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
      .mockReturnValueOnce(['customer:read']); // PERMISSIONS_KEY
    await expect(guard.canActivate(mockContext(undefined))).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.userRole.findMany).not.toHaveBeenCalled();
  });

  it('fetches only permission names via the nested select shape (fail-closed)', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
      .mockReturnValueOnce(['customer:read']); // PERMISSIONS_KEY
    prisma.userRole.findMany.mockResolvedValue(grantRows(['customer:read']));

    await guard.canActivate(
      mockContext({
        userId: 'u1',
        roles: ['user'],
        companyId: 'company-1',
        isSuperAdmin: false,
      }),
    );

    expect(prisma.userRole.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
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
  });
});

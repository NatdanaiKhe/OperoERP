import {
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { RolesGuard } from '@/common/guards/roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const mockContext = (user: unknown) =>
    ({
      getHandler: () => 'handler',
      getClass: () => 'class',
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as never);
  });

  it('returns true for @Public routes', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true); // IS_PUBLIC_KEY
    expect(guard.canActivate(mockContext(undefined))).toBe(true);
  });

  it('returns true when no @Roles metadata is set', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
      .mockReturnValueOnce(undefined); // ROLES_KEY
    expect(guard.canActivate(mockContext(undefined))).toBe(true);
  });

  it('returns true when user has a matching role', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
      .mockReturnValueOnce(['admin']); // ROLES_KEY
    expect(
      guard.canActivate(
        mockContext({ userId: 'u1', roles: ['admin', 'user'] }),
      ),
    ).toBe(true);
  });

  it('throws ForbiddenException when user lacks the required role', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
      .mockReturnValueOnce(['admin']); // ROLES_KEY
    expect(() =>
      guard.canActivate(mockContext({ userId: 'u1', roles: ['user'] })),
    ).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when req.user is undefined (defensive)', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
      .mockReturnValueOnce(['admin']); // ROLES_KEY
    expect(() => guard.canActivate(mockContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});

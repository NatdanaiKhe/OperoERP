import { AuthController } from '@/auth/auth.controller';
import { PERMISSIONS_KEY } from '@/common/decorators/permissions.decorator';

// Mirrors the M2 tracer-slice assertion: each guarded handler carries the
// expected PERMISSIONS_KEY metadata so the global PermissionsGuard enforces it.
describe('AuthController permission metadata', () => {
  const metadataFor = (methodName: keyof AuthController) =>
    Reflect.getMetadata(PERMISSIONS_KEY, AuthController.prototype[methodName]);

  it('GET /auth/users requires user:read', () => {
    expect(metadataFor('listUsers')).toEqual(['user:read']);
  });

  it('PATCH /auth/users/:id requires user:update', () => {
    expect(metadataFor('updateUser')).toEqual(['user:update']);
  });

  it('DELETE /auth/users/:id requires user:delete', () => {
    expect(metadataFor('deleteUser')).toEqual(['user:delete']);
  });

  it('POST /auth/invite requires user:create', () => {
    expect(metadataFor('invite')).toEqual(['user:create']);
  });
});

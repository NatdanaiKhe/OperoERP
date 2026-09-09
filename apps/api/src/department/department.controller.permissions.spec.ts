import { DepartmentController } from './department.controller';
import { PERMISSIONS_KEY } from '@/common/decorators/permissions.decorator';

// Mirrors auth.controller.permissions.spec.ts: each guarded handler carries the
// expected PERMISSIONS_KEY metadata so the global PermissionsGuard enforces it.
describe('DepartmentController permission metadata', () => {
  const metadataFor = (methodName: keyof DepartmentController) =>
    Reflect.getMetadata(
      PERMISSIONS_KEY,
      DepartmentController.prototype[methodName],
    );

  it('POST /department requires department:create', () => {
    expect(metadataFor('create')).toEqual(['department:create']);
  });

  it('GET /department requires department:read', () => {
    expect(metadataFor('findAll')).toEqual(['department:read']);
  });

  it('GET /department/:id requires department:read', () => {
    expect(metadataFor('findOne')).toEqual(['department:read']);
  });

  it('PATCH /department/:id requires department:update', () => {
    expect(metadataFor('update')).toEqual(['department:update']);
  });

  it('DELETE /department/:id requires department:delete', () => {
    expect(metadataFor('remove')).toEqual(['department:delete']);
  });

  it('POST /department/:id/users/:userId requires department:update', () => {
    expect(metadataFor('assignUser')).toEqual(['department:update']);
  });

  it('POST /department/:id/reassign requires department:update', () => {
    expect(metadataFor('reassignUsers')).toEqual(['department:update']);
  });
});

import { CompanyController } from '@/company/company.controller';
import { PERMISSIONS_KEY } from '@/common/decorators/permissions.decorator';

// Mirrors auth.controller.permissions.spec.ts: each guarded handler carries the
// expected PERMISSIONS_KEY metadata so the global PermissionsGuard enforces it.
describe('CompanyController permission metadata', () => {
  const metadataFor = (methodName: keyof CompanyController) =>
    Reflect.getMetadata(
      PERMISSIONS_KEY,
      CompanyController.prototype[methodName],
    );

  it('POST /company requires company:create', () => {
    expect(metadataFor('create')).toEqual(['company:create']);
  });

  it('GET /company requires company:read', () => {
    expect(metadataFor('findAll')).toEqual(['company:read']);
  });

  it('GET /company/:id requires company:read', () => {
    expect(metadataFor('findOne')).toEqual(['company:read']);
  });

  it('PATCH /company/:id requires company:update', () => {
    expect(metadataFor('update')).toEqual(['company:update']);
  });

  it('DELETE /company/:id requires company:delete', () => {
    expect(metadataFor('remove')).toEqual(['company:delete']);
  });
});

import {
  applyTenantScope,
  tenantScopeExtension,
} from './tenant-scope.extension';
import { runWithTenantContext } from './tenant-context';

const COMPANY = 'company-1';

describe('applyTenantScope', () => {
  it('injects companyId and deletedAt into scoped read operations', () => {
    runWithTenantContext({ companyId: COMPANY }, () => {
      for (const operation of ['findMany', 'findFirst', 'count']) {
        expect(applyTenantScope(operation, { where: { name: 'x' } })).toEqual({
          where: { name: 'x', companyId: COMPANY, deletedAt: null },
        });
      }
    });
  });

  it('injected values win over caller-supplied ones', () => {
    runWithTenantContext({ companyId: COMPANY }, () => {
      const scoped = applyTenantScope('findMany', {
        where: { companyId: 'attacker', deletedAt: new Date() },
      });
      expect(scoped.where).toEqual({
        companyId: COMPANY,
        deletedAt: null,
      });
    });
  });

  it('leaves unscoped operations untouched', () => {
    runWithTenantContext({ companyId: COMPANY }, () => {
      const args = { where: { id: 'p1' }, data: { name: 'x' } };
      for (const operation of ['findUnique', 'create', 'delete', 'upsert']) {
        expect(applyTenantScope(operation, args)).toBe(args);
      }
    });
  });

  it('fails open on missing context but still hides soft-deleted rows', () => {
    expect(applyTenantScope('findMany', { where: {} })).toEqual({
      where: { deletedAt: null },
    });
  });

  it('targets deleted rows only when restoring (data.deletedAt = null)', () => {
    runWithTenantContext({ companyId: COMPANY }, () => {
      const restore = applyTenantScope('update', {
        where: { id: 'd1' },
        data: { deletedAt: null },
      });
      expect(restore.where).toEqual({
        id: 'd1',
        companyId: COMPANY,
        deletedAt: { not: null },
      });

      const softDelete = applyTenantScope('update', {
        where: { id: 'd1' },
        data: { deletedAt: new Date() },
      });
      expect(softDelete.where).toEqual({
        id: 'd1',
        companyId: COMPANY,
        deletedAt: null,
      });
    });
  });
});

describe('tenantScopeExtension', () => {
  it('covers exactly the five tenant-scoped models', () => {
    expect(Object.keys(tenantScopeExtension.query).sort()).toEqual([
      'customer',
      'department',
      'product',
      'productCategory',
      'unitOfMeasure',
    ]);
  });
});

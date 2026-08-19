import { apiFetch } from '@/app/lib/api-client';
import type { RoleWithMenu, UpdateMenuConfigPayload } from './types';

export async function fetchRoles(): Promise<RoleWithMenu[]> {
  return apiFetch<RoleWithMenu[]>('/roles');
}

export async function updateRoleMenuConfig(
  roleId: string,
  payload: UpdateMenuConfigPayload,
): Promise<RoleWithMenu> {
  return apiFetch<RoleWithMenu>(`/roles/${roleId}/menu-config`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

import { apiFetch } from '@/app/lib/api-client';
import type {
  Department,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from './types';

export async function fetchDepartments(): Promise<Department[]> {
  return apiFetch<Department[]>('/department');
}

export async function createDepartment(
  payload: CreateDepartmentPayload,
): Promise<Department> {
  return apiFetch<Department>('/department', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDepartment(
  id: string,
  payload: UpdateDepartmentPayload,
): Promise<Department> {
  return apiFetch<Department>(`/department/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteDepartment(id: string): Promise<void> {
  await apiFetch<void>(`/department/${id}`, { method: 'DELETE' });
}

export async function reassignDepartmentUsers(
  fromId: string,
  toId: string,
): Promise<{ moved: number }> {
  return apiFetch<{ moved: number }>(`/department/${fromId}/reassign`, {
    method: 'POST',
    body: JSON.stringify({ targetDepartmentId: toId }),
  });
}

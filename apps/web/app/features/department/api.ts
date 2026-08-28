import { apiFetch } from '@/app/lib/api-client';
import type { Department } from './types';

export async function fetchDepartments(): Promise<Department[]> {
  return apiFetch<Department[]>('/department');
}

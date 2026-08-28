import { apiFetch } from '@/app/lib/api-client';
import type { Company, UpdateCompanyPayload } from './types';

export async function fetchCompany(companyId: string): Promise<Company> {
  return apiFetch<Company>(`/company/${companyId}`);
}

export async function updateCompany(
  companyId: string,
  payload: UpdateCompanyPayload,
): Promise<Company> {
  return apiFetch<Company>(`/company/${companyId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

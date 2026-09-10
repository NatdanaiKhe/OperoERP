import { apiFetch } from '@/app/lib/api-client';
import type {
  Customer,
  CustomersResponse,
  CustomerFilters,
  CustomerPayload,
  CustomerSearchField,
} from './types';

const FIELD_PARAM: Record<CustomerSearchField, string> = {
  name: 'name',
  email: 'email',
  taxId: 'taxId',
};

export async function fetchCustomers(
  filters: CustomerFilters,
): Promise<CustomersResponse> {
  const params = new URLSearchParams();
  const query = filters.query.trim();
  if (query && filters.field) {
    params.set(FIELD_PARAM[filters.field], query);
  }
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));
  return apiFetch<CustomersResponse>(`/customer?${params.toString()}`);
}

export async function fetchCustomer(id: string): Promise<Customer> {
  return apiFetch<Customer>(`/customer/${id}`);
}

export async function createCustomer(
  payload: CustomerPayload,
): Promise<Customer> {
  return apiFetch<Customer>('/customer', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCustomer(
  id: string,
  payload: CustomerPayload,
): Promise<Customer> {
  return apiFetch<Customer>(`/customer/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

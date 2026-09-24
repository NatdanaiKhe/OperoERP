import { apiFetch } from '@/app/lib/api-client';
import type { InventoryFilters, InventoryResponse } from './types';

export async function fetchInventory(
  filters: InventoryFilters,
): Promise<InventoryResponse> {
  const params = new URLSearchParams();
  const query = filters.query.trim();
  if (query) {
    params.set('search', query);
  }
  if (filters.status === 'low') {
    params.set('lowStockOnly', 'true');
  } else if (filters.status !== 'all') {
    params.set('status', filters.status);
  }
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));
  return apiFetch<InventoryResponse>(`/inventory?${params.toString()}`);
}

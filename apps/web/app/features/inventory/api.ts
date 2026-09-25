import { apiFetch } from '@/app/lib/api-client';
import type {
  AdjustStockPayload,
  InventoryFilters,
  InventoryResponse,
  InventoryItem,
  MovementsResponse,
} from './types';

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

export async function adjustStock(
  payload: AdjustStockPayload,
): Promise<InventoryItem> {
  return apiFetch<InventoryItem>('/inventory/adjust', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchMovements(
  productId: string,
  page = 1,
  limit = 10,
): Promise<MovementsResponse> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  return apiFetch<MovementsResponse>(
    `/inventory/product/${encodeURIComponent(productId)}/movements?${params.toString()}`,
  );
}

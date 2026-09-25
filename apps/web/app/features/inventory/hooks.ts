'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchInventory, adjustStock, fetchMovements } from './api';
import type { InventoryFilters, AdjustStockPayload } from './types';

export const INVENTORY_KEY = ['inventory', 'list'] as const;
export const MOVEMENTS_KEY = ['inventory', 'movements'] as const;

export function useInventory(filters: InventoryFilters) {
  return useQuery({
    queryKey: [...INVENTORY_KEY, filters],
    queryFn: () => fetchInventory(filters),
  });
}

export function useMovements(productId: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: [...MOVEMENTS_KEY, productId, page],
    queryFn: () => fetchMovements(productId, page, limit),
    enabled: !!productId,
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdjustStockPayload) => adjustStock(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVENTORY_KEY });
      qc.invalidateQueries({ queryKey: MOVEMENTS_KEY });
    },
  });
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchInventory } from './api';
import type { InventoryFilters } from './types';

export const INVENTORY_KEY = ['inventory', 'list'] as const;

export function useInventory(filters: InventoryFilters) {
  return useQuery({
    queryKey: [...INVENTORY_KEY, filters],
    queryFn: () => fetchInventory(filters),
  });
}

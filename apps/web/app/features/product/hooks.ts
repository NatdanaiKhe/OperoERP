'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchProducts, fetchProductCategories } from './api';
import type { ProductFilters } from './types';

export const PRODUCTS_KEY = ['products', 'list'] as const;
export const PRODUCT_CATEGORIES_KEY = ['products', 'categories'] as const;

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, filters],
    queryFn: () => fetchProducts(filters),
  });
}

export function useProductCategories() {
  return useQuery({
    queryKey: PRODUCT_CATEGORIES_KEY,
    queryFn: fetchProductCategories,
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchProducts,
  fetchProduct,
  fetchProductCategories,
  fetchProductUoms,
  createProduct,
  updateProduct,
} from './api';
import type { ProductFilters, ProductPayload } from './types';

export const PRODUCTS_KEY = ['products', 'list'] as const;
export const PRODUCT_CATEGORIES_KEY = ['products', 'categories'] as const;
export const PRODUCT_UOMS_KEY = ['products', 'uoms'] as const;
export const PRODUCT_DETAIL_KEY = ['products', 'detail'] as const;

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

export function useProductUoms() {
  return useQuery({
    queryKey: PRODUCT_UOMS_KEY,
    queryFn: fetchProductUoms,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: [...PRODUCT_DETAIL_KEY, id],
    queryFn: () => fetchProduct(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductPayload) => createProduct(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProductPayload }) =>
      updateProduct(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCTS_KEY });
      qc.invalidateQueries({ queryKey: PRODUCT_DETAIL_KEY });
    },
  });
}

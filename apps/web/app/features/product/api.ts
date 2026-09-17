import { apiFetch } from '@/app/lib/api-client';
import type {
  BaseUom,
  Product,
  ProductCategory,
  ProductFilters,
  ProductPayload,
  ProductsResponse,
} from './types';

const FIELD_PARAM: Record<'name' | 'sku', string> = {
  name: 'name',
  sku: 'sku',
};

export async function fetchProducts(
  filters: ProductFilters,
): Promise<ProductsResponse> {
  const params = new URLSearchParams();
  const query = filters.query.trim();
  if (query && filters.field) {
    params.set(FIELD_PARAM[filters.field], query);
  }
  if (filters.categoryId) {
    params.set('categoryId', filters.categoryId);
  }
  if (filters.isActive !== undefined) {
    params.set('isActive', String(filters.isActive));
  }
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));
  return apiFetch<ProductsResponse>(`/product?${params.toString()}`);
}

export async function fetchProductCategories(): Promise<ProductCategory[]> {
  return apiFetch<ProductCategory[]>('/product/category');
}

export async function fetchProductUoms(): Promise<BaseUom[]> {
  return apiFetch<BaseUom[]>('/product/uom');
}

export async function fetchProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/product/${id}`);
}

export async function createProduct(
  payload: ProductPayload,
): Promise<Product> {
  return apiFetch<Product>('/product', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(
  id: string,
  payload: ProductPayload,
): Promise<Product> {
  return apiFetch<Product>(`/product/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

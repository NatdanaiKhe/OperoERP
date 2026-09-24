export interface InventoryItem {
  id?: string | null;
  productId: string;
  productName: string;
  sku?: string | null;
  quantity: number;
  reorderPoint?: number | null;
  isLowStock: boolean;
}

export interface InventoryMeta {
  total: number;
  page: number;
  limit: number;
}

export interface InventoryResponse {
  data: InventoryItem[];
  meta: InventoryMeta;
}

export type InventoryStatus = 'in_stock' | 'low' | 'out_of_stock';

export interface InventoryFilters {
  query: string;
  status: InventoryStatus | 'all';
  page: number;
  limit: number;
}

export const STATUS_OPTIONS: {
  value: InventoryFilters['status'];
  label: string;
}[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
];

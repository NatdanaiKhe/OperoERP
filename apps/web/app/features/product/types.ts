export interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface BaseUom {
  id: string;
  name: string;
  symbol: string;
}

export interface Product {
  id: string;
  companyId: string;
  sku: string | null;
  name: string;
  description: string | null;
  type: 'STOCKABLE' | 'SERVICE' | 'NON_STOCK';
  trackingMode: 'NONE' | 'LOT' | 'SERIAL';
  categoryId: string | null;
  category: ProductCategory | null;
  baseUomId: string;
  baseUom: BaseUom;
  defaultSalesPrice: string | null;
  defaultCost: string | null;
  defaultTaxRate: string | null;
  isSellable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProductsMeta {
  total: number;
  page: number;
  limit: number;
}

export interface ProductsResponse {
  data: Product[];
  meta: ProductsMeta;
}

export interface ProductPayload {
  name: string;
  baseUomId: string;
  description?: string;
  sku?: string;
  categoryId?: string;
  type?: Product['type'];
  trackingMode?: Product['trackingMode'];
  defaultSalesPrice?: number;
  defaultCost?: number;
  defaultTaxRate?: number;
  isSellable?: boolean;
  isActive?: boolean;
}

export type ProductSearchField = 'name' | 'sku';

export interface ProductFilters {
  field?: ProductSearchField;
  query: string;
  categoryId?: string;
  isActive?: boolean;
  page: number;
  limit: number;
}

export const TYPE_OPTIONS = [
  { value: 'STOCKABLE', label: 'Stockable' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'NON_STOCK', label: 'Non-stock' },
];

export const TRACKING_OPTIONS = [
  { value: 'NONE', label: 'None' },
  { value: 'LOT', label: 'Lot' },
  { value: 'SERIAL', label: 'Serial' },
];

export const NO_CATEGORY = 'none';

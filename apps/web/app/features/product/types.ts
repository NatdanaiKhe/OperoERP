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

export type ProductSearchField = 'name' | 'sku';

export interface ProductFilters {
  field?: ProductSearchField;
  query: string;
  categoryId?: string;
  isActive?: boolean;
  page: number;
  limit: number;
}

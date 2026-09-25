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

export type ManualMovementType = 'RECEIPT' | 'ADJUSTMENT' | 'WRITE_OFF';

export type MovementType = ManualMovementType | 'SALE' | 'SALE_CANCELLED';

export const MOVEMENT_TYPE_OPTIONS: {
  value: ManualMovementType;
  label: string;
}[] = [
  { value: 'RECEIPT', label: 'Receipt' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
  { value: 'WRITE_OFF', label: 'Write-off' },
];

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  RECEIPT: 'Receipt',
  ADJUSTMENT: 'Adjustment',
  WRITE_OFF: 'Write-off',
  SALE: 'Sale',
  SALE_CANCELLED: 'Sale Cancelled',
};

export const DEFAULT_MOVEMENT_PAGE_LIMIT = 10;

export type MovementBadgeVariant =
  'success' | 'destructive' | 'warning' | 'secondary';

export const MOVEMENT_TYPE_VARIANTS: Record<
  MovementType,
  MovementBadgeVariant
> = {
  RECEIPT: 'success',
  WRITE_OFF: 'destructive',
  ADJUSTMENT: 'warning',
  SALE: 'secondary',
  SALE_CANCELLED: 'secondary',
};

export interface AdjustStockPayload {
  productId: string;
  type: ManualMovementType;
  quantity: number;
  reason?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: MovementType;
  quantity: number | string;
  reason?: string | null;
  referenceId?: string | null;
  createdById: string;
  createdBy?: { firstName: string; lastName: string } | null;
  createdAt: string;
}

export interface MovementsMeta {
  total: number;
  page: number;
  limit: number;
}

export interface MovementsResponse {
  data: StockMovement[];
  meta: MovementsMeta;
}

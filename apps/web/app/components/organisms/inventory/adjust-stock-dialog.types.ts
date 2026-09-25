import type { InventoryItem } from '@/app/features/inventory/types';

export interface AdjustStockDialogProps {
  open: boolean;
  onClose: () => void;
  product: InventoryItem;
}

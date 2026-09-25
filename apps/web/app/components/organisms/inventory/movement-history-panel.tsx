'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/app/components/atoms/badge';
import { Button } from '@/app/components/atoms/button';
import {
  Table,
  TableHead,
  TableHeaderRow,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/app/components/atoms/table';
import {
  TableSkeleton,
  TableEmpty,
} from '@/app/components/molecules/table-placeholder';
import { DrawerShell } from '@/app/components/molecules/drawer-shell';
import { QueryError } from '@/app/components/molecules/query-error';
import { useMovements } from '@/app/features/inventory/hooks';
import {
  MOVEMENT_TYPE_LABELS,
  type MovementType,
  type StockMovement,
} from '@/app/features/inventory/types';
import { formatDateTime } from '@/app/lib/format';

const LIMIT = 10;

function movementVariant(type: MovementType) {
  switch (type) {
    case 'RECEIPT':
      return 'success';
    case 'WRITE_OFF':
      return 'destructive';
    case 'ADJUSTMENT':
      return 'warning';
    default:
      return 'secondary';
  }
}

function formatMovementQuantity(value: number | string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (n > 0) return `+${n}`;
  return String(n);
}

function actorName(movement: StockMovement) {
  if (movement.createdBy) {
    return `${movement.createdBy.firstName} ${movement.createdBy.lastName}`.trim();
  }
  return movement.createdById;
}

interface MovementHistoryPanelProps {
  productId: string;
  productName: string;
  onClose: () => void;
}

export function MovementHistoryPanel({
  productId,
  productName,
  onClose,
}: MovementHistoryPanelProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isFetching, refetch } = useMovements(
    productId,
    page,
    LIMIT,
  );

  const movements = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <DrawerShell title="Movement History" open onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">{productName}</p>
        </div>

        {isError ? (
          <QueryError
            message="Failed to load movement history."
            onRetry={() => refetch()}
            retrying={isFetching}
          />
        ) : isLoading ? (
          <TableSkeleton
            rows={4}
            columns={5}
            gridClassName="grid-cols-[1fr_1fr_2fr_1fr_1fr]"
          />
        ) : movements.length === 0 ? (
          <TableEmpty>No stock movements yet.</TableEmpty>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableHeaderRow>
                  <TableHeader>Type</TableHeader>
                  <TableHeader className="text-right">Quantity</TableHeader>
                  <TableHeader>Reason</TableHeader>
                  <TableHeader>Actor</TableHeader>
                  <TableHeader>Date</TableHeader>
                </TableHeaderRow>
              </TableHead>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <Badge variant={movementVariant(movement.type)}>
                        {MOVEMENT_TYPE_LABELS[movement.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatMovementQuantity(movement.quantity)}
                    </TableCell>
                    <TableCell>{movement.reason ?? '—'}</TableCell>
                    <TableCell>{actorName(movement)}</TableCell>
                    <TableCell>{formatDateTime(movement.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              {total > 0
                ? `Showing ${(page - 1) * LIMIT + 1} to ${Math.min(
                    page * LIMIT,
                    total,
                  )} of ${total} movements`
                : 'No entries'}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                aria-label="Next page"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

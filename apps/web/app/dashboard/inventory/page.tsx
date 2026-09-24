'use client';

import { useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/app/components/atoms';
import { Input } from '@/app/components/atoms';
import { Select } from '@/app/components/atoms';
import { Badge } from '@/app/components/atoms/badge';
import { QueryError } from '@/app/components/molecules/query-error';
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
import { useInventory } from '@/app/features/inventory/hooks';
import type {
  InventoryFilters,
  InventoryItem,
} from '@/app/features/inventory/types';
import { STATUS_OPTIONS } from '@/app/features/inventory/types';

const PAGE_SIZES = [10, 25, 50];

function statusBadge(item: InventoryItem) {
  if (item.quantity === 0) {
    return <Badge variant="destructive">Out of Stock</Badge>;
  }
  if (item.isLowStock) {
    return <Badge variant="warning">Low Stock</Badge>;
  }
  return <Badge variant="success">In Stock</Badge>;
}

export default function InventoryPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState<InventoryFilters['status']>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const hasSearch = debouncedQuery.trim().length > 0;
  const hasActiveFilters = hasSearch || status !== 'all';

  const { data, isLoading, isError, isFetching, refetch } = useInventory({
    query: debouncedQuery,
    status,
    page,
    limit: pageSize,
  });

  const items = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = total > 0 ? Math.min(page * pageSize, total) : 0;

  function resetPage() {
    setPage(1);
  }

  function clearFilters() {
    setQuery('');
    setStatus('all');
    resetPage();
  }

  const emptyState = hasActiveFilters ? (
    <>
      No inventory items match your filters.
      <Button
        onClick={clearFilters}
        variant="ghost"
        className="ml-2 font-medium text-primary hover:underline"
      >
        Clear filters
      </Button>
    </>
  ) : (
    <>No inventory yet.</>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor stock levels and availability across your catalog.
          </p>
        </div>
      </div>

      {isError ? (
        <QueryError
          message="Failed to load inventory. Please try again."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex-1 max-w-120">
              <Input
                icon={<Search className="h-4 w-4" />}
                placeholder="Search by product name or SKU..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  resetPage();
                }}
                onClear={() => {
                  setQuery('');
                  resetPage();
                }}
              />
            </div>

            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as InventoryFilters['status']);
                resetPage();
              }}
              options={STATUS_OPTIONS}
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-border/30 bg-card">
            {isLoading ? (
              <TableSkeleton
                rows={5}
                columns={5}
                gridClassName="grid-cols-[1fr_2fr_1fr_1fr_1fr]"
              />
            ) : items.length === 0 ? (
              <TableEmpty>{emptyState}</TableEmpty>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableHeaderRow>
                      <TableHeader>SKU</TableHeader>
                      <TableHeader>Product Name</TableHeader>
                      <TableHeader className="text-right">On Hand</TableHeader>
                      <TableHeader className="text-right">
                        Reorder Point
                      </TableHeader>
                      <TableHeader>Status</TableHeader>
                    </TableHeaderRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell>
                          <span className="font-mono text-sm text-foreground">
                            {item.sku ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium text-foreground">
                            {item.productName}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-sm tabular-nums text-foreground">
                            {item.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-sm tabular-nums text-foreground">
                            {item.reorderPoint ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell>{statusBadge(item)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              {total > 0
                ? `Showing ${from} to ${to} of ${total} items`
                : 'No entries'}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24">
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    resetPage();
                  }}
                  options={PAGE_SIZES.map((n) => ({
                    value: String(n),
                    label: `${n} / page`,
                  }))}
                />
              </div>
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
        </>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  X,
} from 'lucide-react';
import { Button } from '@/app/components/atoms';
import { Input } from '@/app/components/atoms';
import { Select } from '@/app/components/atoms';
import { Badge } from '@/app/components/atoms/badge';
import { QueryError } from '@/app/components/molecules/query-error';
import { FormAlert } from '@/app/components/molecules/form-alert';
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
import {
  useProducts,
  useProductCategories,
} from '@/app/features/product/hooks';
import type { Product, ProductSearchField } from '@/app/features/product/types';
import { formatCurrency } from '@/app/lib/format';

const PAGE_SIZES = [10, 25, 50];

const FIELD_OPTIONS: { value: ProductSearchField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'sku', label: 'SKU' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

function marginPercent(product: Product): string | null {
  const sell = product.defaultSalesPrice
    ? Number(product.defaultSalesPrice)
    : null;
  const cost = product.defaultCost ? Number(product.defaultCost) : null;
  if (sell == null || cost == null || sell === 0) return null;
  return `${(((sell - cost) / sell) * 100).toFixed(1)}%`;
}

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [field, setField] = useState<ProductSearchField>('name');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const saved = searchParams.get('saved') === '1';

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const hasSearch = debouncedQuery.trim().length > 0;
  const hasActiveFilters = hasSearch || category !== 'all' || status !== 'all';

  const { data, isLoading, isError, isFetching, refetch } = useProducts({
    field: hasSearch ? field : undefined,
    query: debouncedQuery,
    categoryId: category !== 'all' ? category : undefined,
    isActive: status === 'all' ? undefined : status === 'active',
    page,
    limit: pageSize,
  });

  const { data: categories } = useProductCategories();
  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...(categories ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  const products = data?.data ?? [];
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
    setCategory('all');
    setStatus('all');
    resetPage();
  }

  const emptyState = hasActiveFilters ? (
    <>
      No products match your filters.
      <Button
        onClick={clearFilters}
        variant="ghost"
        className="ml-2 font-medium text-primary hover:underline"
      >
        Clear filters
      </Button>
    </>
  ) : (
    <>No products yet.</>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your product catalog and pricing.
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/products/new')}>
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {saved && (
        <FormAlert
          variant="success"
          className="flex items-center justify-between"
        >
          Product saved.
          <Button
            onClick={() => router.replace('/dashboard/products')}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </FormAlert>
      )}

      {isError ? (
        <QueryError
          message="Failed to load products. Please try again."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="group relative w-28">
              <Select
                value={field}
                onValueChange={(v) => {
                  setField(v as ProductSearchField);
                  if (hasSearch) resetPage();
                }}
                options={FIELD_OPTIONS}
              />
            </div>
            <Input
              icon={<Search className="h-4 w-4" />}
              placeholder="Search products by name or SKU..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                resetPage();
              }}
              onClear={() => {
                setQuery('');
                resetPage();
              }}
              className="flex-1 min-w-48"
            />

            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                resetPage();
              }}
              options={categoryOptions}
            />

            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                resetPage();
              }}
              options={STATUS_OPTIONS}
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-border/30 bg-card">
            {isLoading ? (
              <TableSkeleton
                rows={5}
                columns={8}
                gridClassName="grid-cols-[1fr_2fr_1fr_1fr_1fr_1fr_1fr_1fr]"
              />
            ) : products.length === 0 ? (
              <TableEmpty>{emptyState}</TableEmpty>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableHeaderRow>
                      <TableHeader>SKU</TableHeader>
                      <TableHeader>Product Name</TableHeader>
                      <TableHeader>Category</TableHeader>
                      <TableHeader>Cost Price</TableHeader>
                      <TableHeader>Selling Price</TableHeader>
                      <TableHeader>Margin</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader className="text-right">Actions</TableHeader>
                    </TableHeaderRow>
                  </TableHead>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <span className="font-mono text-sm text-foreground">
                            {product.sku ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium text-foreground">
                            {product.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">
                            {product.category?.name ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm tabular-nums text-foreground">
                            {formatCurrency(product.defaultCost)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm tabular-nums text-foreground">
                            {formatCurrency(product.defaultSalesPrice)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm tabular-nums text-muted-foreground">
                            {marginPercent(product) ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {product.isActive ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/products/${product.id}/edit`)
                            }
                            aria-label={`Edit ${product.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </TableCell>
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
                ? `Showing ${from} to ${to} of ${total} products`
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

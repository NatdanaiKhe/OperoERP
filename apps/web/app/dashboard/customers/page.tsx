'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  Search,
  Download,
  Pencil,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/app/components/atoms';
import { Input } from '@/app/components/atoms';
import { Select } from '@/app/components/atoms';
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
import { useCustomers } from '@/app/features/customer/hooks';
import { useCanAccess } from '@/app/features/auth/hooks';
import type {
  Customer,
  CustomerSearchField,
} from '@/app/features/customer/types';
import { formatDate } from '@/app/lib/format';

const PAGE_SIZE = 20;

const FIELD_OPTIONS: {
  value: CustomerSearchField | 'phone';
  label: string;
  disabled?: boolean;
}[] = [
  { value: 'name', label: 'Company Name' },
  { value: 'email', label: 'Email' },
  { value: 'taxId', label: 'Tax ID' },
];

function exportCsv(rows: Customer[]) {
  const header = [
    'Company Name',
    'Contact Person',
    'Email',
    'Phone',
    'Tax ID',
    'Updated',
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    header.join(','),
    ...rows.map((r) =>
      [
        r.name,
        r.contactPerson ?? '',
        r.email,
        r.phone ?? '',
        r.taxId ?? '',
        r.updatedAt,
      ]
        .map((v) => escape(v))
        .join(','),
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'customers.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function CustomersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canAccess, isLoading: gateLoading } = useCanAccess('customers');

  const [field, setField] = useState<CustomerSearchField>('name');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);

  const saved = searchParams.get('saved') === '1';

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!gateLoading && !canAccess) {
      router.replace('/dashboard');
    }
  }, [gateLoading, canAccess, router]);

  const hasSearch = debouncedQuery.trim().length > 0;
  const { data, isLoading, isError, isFetching, refetch } = useCustomers({
    field: hasSearch ? field : undefined,
    query: debouncedQuery,
    page,
    pageSize: PAGE_SIZE,
  });

  if (gateLoading || !canAccess) return null;

  const customers = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const totalPages = meta?.totalPages ?? 1;
  const from = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = total > 0 ? Math.min(page * PAGE_SIZE, total) : 0;

  function handleSearchChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  function handleFieldChange(value: string) {
    setField(value as CustomerSearchField);
    if (hasSearch) {
      setPage(1);
    }
  }

  function clearSearch() {
    setQuery('');
    setPage(1);
  }

  const emptyState = hasSearch ? (
    <>
      No customers match your search.
      <Button
        onClick={clearSearch}
        className="ml-2 font-medium text-primary hover:underline"
      >
        Clear search
      </Button>
    </>
  ) : (
    <>
      No customers yet.{' '}
      <Button
        onClick={() => router.push('/dashboard/customers/new')}
        className="font-medium text-primary hover:underline"
      >
        Add your first customer
      </Button>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Customer Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your customers and their contact details.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => exportCsv(customers)}
            disabled={customers.length === 0}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => router.push('/dashboard/customers/new')}>
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {saved && (
        <FormAlert
          variant="success"
          className="flex items-center justify-between"
        >
          Customer saved.
          <Button
            onClick={() => router.replace('/dashboard/customers')}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </FormAlert>
      )}

      {isError ? (
        <FormAlert className="flex items-center justify-between">
          Failed to load customers. Please try again.
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            Retry
          </Button>
        </FormAlert>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="group relative">
              <Select
                value={field}
                onValueChange={handleFieldChange}
                placeholder="Search customers by company name, email, or tax ID."
                options={FIELD_OPTIONS}
              />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={query}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border/30 bg-card">
            {isLoading ? (
              <TableSkeleton rows={5} columns={6} gridClassName="grid-cols-6" />
            ) : customers.length === 0 ? (
              <TableEmpty>{emptyState}</TableEmpty>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableHeaderRow>
                      <TableHeader>Company Name</TableHeader>
                      <TableHeader>Contact Person</TableHeader>
                      <TableHeader>Email</TableHeader>
                      <TableHeader>Phone</TableHeader>
                      <TableHeader>Updated</TableHeader>
                      <TableHeader className="text-right">Actions</TableHeader>
                    </TableHeaderRow>
                  </TableHead>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <span className="text-sm font-medium text-foreground">
                            {customer.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">
                            {customer.contactPerson ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-foreground">
                            {customer.email}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">
                            {customer.phone ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(customer.updatedAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/dashboard/customers/${customer.id}/edit`,
                              )
                            }
                            aria-label={`Edit ${customer.name}`}
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

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {total > 0
                ? `Showing ${from} to ${to} of ${total} entries`
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
        </>
      )}
    </div>
  );
}

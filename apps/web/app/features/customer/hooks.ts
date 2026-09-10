'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchCustomers,
  fetchCustomer,
  createCustomer,
  updateCustomer,
} from './api';
import type { CustomerFilters, CustomerPayload } from './types';

export const CUSTOMERS_KEY = ['customers', 'list'] as const;

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: [...CUSTOMERS_KEY, filters],
    queryFn: () => fetchCustomers(filters),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', 'detail', id],
    queryFn: () => fetchCustomer(id),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CustomerPayload) => createCustomer(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUSTOMERS_KEY });
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CustomerPayload }) =>
      updateCustomer(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUSTOMERS_KEY });
      qc.invalidateQueries({ queryKey: ['customers', 'detail'] });
    },
  });
}

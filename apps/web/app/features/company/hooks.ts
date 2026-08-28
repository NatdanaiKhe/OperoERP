'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCompany, updateCompany } from './api';
import type { UpdateCompanyPayload } from './types';

export function useCompany(companyId: string | null) {
  return useQuery({
    queryKey: ['company', companyId],
    queryFn: () => fetchCompany(companyId!),
    enabled: !!companyId,
  });
}

export function useUpdateCompany(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCompanyPayload) =>
      updateCompany(companyId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company', companyId] });
    },
  });
}

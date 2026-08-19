'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchRoles, updateRoleMenuConfig } from './api';
import type { UpdateMenuConfigPayload } from './types';

export const ROLES_KEY = ['roles', 'list'] as const;

export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: fetchRoles,
  });
}

export function useUpdateMenuConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleId,
      payload,
    }: {
      roleId: string;
      payload: UpdateMenuConfigPayload;
    }) => updateRoleMenuConfig(roleId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROLES_KEY });
      qc.invalidateQueries({ queryKey: ['auth', 'profile'] });
    },
  });
}

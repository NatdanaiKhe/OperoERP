'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, inviteUser, updateUser } from './api';
import type { InvitePayload, UpdateUserPayload } from './types';

export const USERS_KEY = ['users', 'list'] as const;

export function useUsers() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: fetchUsers,
  });
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InvitePayload) => inviteUser(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateUserPayload;
    }) => updateUser(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}

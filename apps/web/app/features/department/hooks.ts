'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  reassignDepartmentUsers,
} from './api';
import type {
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
  ReassignPayload,
} from './types';

export const DEPARTMENTS_KEY = ['department', 'list'] as const;

export function useDepartments() {
  return useQuery({
    queryKey: DEPARTMENTS_KEY,
    queryFn: fetchDepartments,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDepartmentPayload) => createDepartment(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DEPARTMENTS_KEY });
    },
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateDepartmentPayload;
    }) => updateDepartment(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DEPARTMENTS_KEY });
    },
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DEPARTMENTS_KEY });
    },
  });
}

export function useReassignDepartmentUsers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fromId, toId }: ReassignPayload) =>
      reassignDepartmentUsers(fromId, toId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DEPARTMENTS_KEY });
      qc.invalidateQueries({ queryKey: ['users', 'list'] });
    },
  });
}

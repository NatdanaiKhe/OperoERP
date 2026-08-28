'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDepartments } from './api';

export const DEPARTMENTS_KEY = ['department', 'list'] as const;

export function useDepartments() {
  return useQuery({
    queryKey: DEPARTMENTS_KEY,
    queryFn: fetchDepartments,
  });
}

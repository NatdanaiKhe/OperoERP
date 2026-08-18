'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDashboardSummary, fetchActivity } from './api';

export const SUMMARY_KEY = ['dashboard', 'summary'] as const;
export const ACTIVITY_KEY = ['dashboard', 'activity'] as const;

export function useDashboardSummary() {
  return useQuery({
    queryKey: SUMMARY_KEY,
    queryFn: fetchDashboardSummary,
  });
}

export function useActivity() {
  return useQuery({
    queryKey: ACTIVITY_KEY,
    queryFn: fetchActivity,
  });
}

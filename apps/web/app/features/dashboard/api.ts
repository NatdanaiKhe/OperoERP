import type { DashboardSummary, DashboardActivity } from './types';

// ponytail: mock data — replace with real API calls when endpoints exist.
// The real implementation will be:
//   import { apiFetch } from '@/app/lib/api-client';
//   export async function fetchDashboardSummary(): Promise<DashboardSummary> {
//     return apiFetch<DashboardSummary>('/dashboard/summary');
//   }
//   export async function fetchActivity(): Promise<DashboardActivity[]> {
//     return apiFetch<DashboardActivity[]>('/dashboard/activity');
//   }

const MOCK_SUMMARY: DashboardSummary = {
  totalCustomers: 2450,
  revenue: '$1.2M',
  openQuotations: 42,
  pendingInvoices: 15,
  overdueInvoices: 5,
  customerTrend: '+12%',
  revenueTrend: '+4.3%',
};

const MOCK_ACTIVITY: DashboardActivity[] = [
  {
    id: '1',
    icon: 'user-plus',
    description: 'New customer **Acme Corp** added',
    actor: 'Jane Doe',
    timestamp: '2 minutes ago',
  },
  {
    id: '2',
    icon: 'file-check',
    description: 'Quote QT-2023-1108 converted to sales order',
    actor: 'Jane Doe',
    timestamp: '1 hour ago',
  },
  {
    id: '3',
    icon: 'dollar-sign',
    description: 'Payment of $4,500 received from Globex',
    actor: 'System',
    timestamp: '3 hours ago',
  },
  {
    id: '4',
    icon: 'shopping-cart',
    description: 'Sales order SO-1024 created',
    actor: 'John Smith',
    timestamp: '5 hours ago',
  },
  {
    id: '5',
    icon: 'clock',
    description: 'Invoice INV-9821 is overdue',
    actor: 'System',
    timestamp: 'Yesterday',
  },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  // ponytail: mock — swap for: return apiFetch<DashboardSummary>('/dashboard/summary');
  await delay(100);
  return MOCK_SUMMARY;
}

export async function fetchActivity(): Promise<DashboardActivity[]> {
  // ponytail: mock — swap for: return apiFetch<DashboardActivity[]>('/dashboard/activity');
  await delay(100);
  return MOCK_ACTIVITY;
}

'use client';

import Link from 'next/link';
import {
  Users,
  CircleDollarSign,
  FileText,
  Receipt,
  Plus,
  UserPlus,
  FileCheck,
  ShoppingCart,
  Clock,
  Wallet,
} from 'lucide-react';
import { Button } from '@/app/components/atoms/button';
import { Card } from '@/app/components/atoms/card';
import { MetricGrid } from '@/app/components/organisms/metric-grid';
import { ActivityFeed } from '@/app/components/organisms/activity-feed';
import { useDashboardSummary, useActivity } from '@/app/features/dashboard/hooks';

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  'user-plus': <UserPlus className="h-4 w-4" />,
  'file-check': <FileCheck className="h-4 w-4" />,
  'dollar-sign': <CircleDollarSign className="h-4 w-4" />,
  'shopping-cart': <ShoppingCart className="h-4 w-4" />,
  clock: <Clock className="h-4 w-4" />,
};

const QUICK_ACTIONS = [
  {
    label: 'New Quote',
    href: '/dashboard/quotes/new',
    description: 'Create a new sales quotation',
    icon: FileText,
  },
  {
    label: 'Add Customer',
    href: '/dashboard/customers/new',
    description: 'Add a new customer record',
    icon: UserPlus,
  },
  {
    label: 'Record Payment',
    href: '/dashboard/payments/new',
    description: 'Log a received payment',
    icon: Wallet,
  },
];

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: activity, isLoading: activityLoading } = useActivity();

  const metrics = summary
    ? [
        {
          label: 'Total Customers',
          value: summary.totalCustomers.toLocaleString(),
          icon: <Users className="h-5 w-5" />,
          trend: { value: summary.customerTrend, direction: 'up' as const },
        },
        {
          label: 'Revenue',
          value: summary.revenue,
          icon: <CircleDollarSign className="h-5 w-5" />,
          trend: { value: summary.revenueTrend, direction: 'up' as const },
        },
        {
          label: 'Open Quotations',
          value: String(summary.openQuotations),
          icon: <FileText className="h-5 w-5" />,
          status: { label: 'Follow-up', variant: 'warning' as const },
        },
        {
          label: 'Pending Invoices',
          value: String(summary.pendingInvoices),
          icon: <Receipt className="h-5 w-5" />,
          status: {
            label: `${summary.overdueInvoices} overdue`,
            variant: 'destructive' as const,
          },
        },
      ]
    : [];

  const activityItems =
    activity?.map((item) => ({
      icon: ACTIVITY_ICONS[item.icon] ?? <Clock className="h-4 w-4" />,
      description: parseDescription(item.description),
      timestamp: item.timestamp,
      actor: item.actor,
    })) ?? [];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Key metrics and recent activity for today.
          </p>
        </div>
        {/* ponytail: placeholder route */}
        <Button asChild>
          <Link href="/dashboard/create">
            <Plus className="h-4 w-4" />
            Create New
          </Link>
        </Button>
      </div>

      {/* Metrics */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="h-32 animate-pulse bg-muted/50" />
          ))}
        </div>
      ) : (
        <MetricGrid metrics={metrics} />
      )}

      {/* Quick Actions */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Quick Actions
        </h2>
        {/* ponytail: placeholder routes */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {QUICK_ACTIONS.map(({ label, href, description, icon: Icon }) => (
            <Link key={href} href={href} className="block">
              <Card className="p-5 transition-colors hover:border-primary/40">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {label}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Activity */}
      {activityLoading ? (
        <Card>
          <div className="h-96 animate-pulse bg-muted/50" />
        </Card>
      ) : (
        <ActivityFeed items={activityItems} />
      )}
    </div>
  );
}

function parseDescription(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part,
  );
}

export interface DashboardSummary {
  totalCustomers: number;
  revenue: string;
  openQuotations: number;
  pendingInvoices: number;
  overdueInvoices: number;
  customerTrend: string;
  revenueTrend: string;
}

export interface DashboardActivity {
  id: string;
  icon: string;
  description: string;
  actor: string;
  timestamp: string;
}

import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/app/components/atoms/card';
import { Badge } from '@/app/components/atoms/badge';

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: { value: string; direction: 'up' | 'down' };
  status?: { label: string; variant: 'warning' | 'destructive' | 'secondary' };
}

export function MetricCard({ label, value, icon, trend, status }: MetricCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        {trend && (
          <Badge variant={trend.direction === 'up' ? 'success' : 'destructive'}>
            {trend.direction === 'up' ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {trend.value}
          </Badge>
        )}
        {status && <Badge variant={status.variant}>{status.label}</Badge>}
      </div>
      <p className="mt-4 font-mono text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </Card>
  );
}

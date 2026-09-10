import { cn } from '@/app/lib/utils';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
  gridClassName?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 6,
  className,
  gridClassName,
}: TableSkeletonProps) {
  return (
    <div
      className={cn('overflow-hidden rounded-lg border border-border/30 bg-card', className)}
    >
      <div className="border-b border-border/30 bg-secondary px-4 py-3">
        <div className={cn('grid gap-4', gridClassName)}>
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-border/30 px-4 py-3">
          <div className={cn('grid gap-4', gridClassName)}>
            {Array.from({ length: columns }).map((_, j) => (
              <div key={j} className="h-8 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface TableEmptyProps {
  children: React.ReactNode;
  className?: string;
}

export function TableEmpty({ children, className }: TableEmptyProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border/30 bg-card',
        className,
      )}
    >
      <div className="px-4 py-12 text-center text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

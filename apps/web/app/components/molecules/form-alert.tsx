import { cn } from '@/app/lib/utils';

interface FormAlertProps {
  variant?: 'error' | 'success';
  children: React.ReactNode;
  className?: string;
}

export function FormAlert({ variant = 'error', children, className }: FormAlertProps) {
  const isError = variant === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={cn(
        'rounded border px-3 py-2 text-sm',
        isError
          ? 'border-destructive/30 bg-destructive/5 text-destructive'
          : 'border-success/30 bg-success/5 text-success',
        className,
      )}
    >
      {children}
    </div>
  );
}

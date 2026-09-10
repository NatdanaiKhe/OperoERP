import * as React from 'react';
import { Input as ShadcnInput } from '@/app/components/ui/input';
import { cn } from '@/app/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  invalid?: boolean;
}

export function Input({ icon, invalid, className, ...props }: InputProps) {
  if (!icon) {
    return (
      <ShadcnInput
        className={cn(
          'bg-white',
          invalid && 'border-destructive focus-visible:ring-destructive/30',
          className,
        )}
        {...props}
      />
    );
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </div>
      <ShadcnInput
        className={cn(
          'pl-10 bg-white',
          invalid && 'border-destructive focus-visible:ring-destructive/30',
          className,
        )}
        {...props}
      />
    </div>
  );
}

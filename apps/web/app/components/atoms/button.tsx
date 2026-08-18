import * as React from 'react';
import {
  Button as ShadcnButton,
  type ButtonProps as ShadcnButtonProps,
} from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';

interface ButtonProps extends ShadcnButtonProps {
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <ShadcnButton
      type={type}
      disabled={disabled || loading}
      className={cn(fullWidth && 'w-full', className)}
      {...props}
    >
      {loading ? 'Signing in...' : children}
    </ShadcnButton>
  );
}

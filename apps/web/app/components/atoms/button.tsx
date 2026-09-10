import * as React from 'react';
import {
  Button as ShadcnButton,
  type ButtonProps as ShadcnButtonProps,
} from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';

interface ButtonProps extends ShadcnButtonProps {
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  className?: string;
  variant?:
    'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  disabled?: boolean;
}

export function Button({
  loading = false,
  loadingText,
  fullWidth = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <ShadcnButton
      variant={props.variant}
      disabled={isDisabled}
      className={cn(fullWidth && 'w-full', className)}
      {...props}
    >
      {loading ? (loadingText ?? 'Loading...') : props.children}
    </ShadcnButton>
  );
}

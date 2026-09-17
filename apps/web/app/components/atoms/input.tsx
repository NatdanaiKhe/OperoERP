import * as React from 'react';
import { X } from 'lucide-react';
import { Input as ShadcnInput } from '@/app/components/ui/input';
import { cn } from '@/app/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  invalid?: boolean;
  onClear?: () => void;
}

export function Input({
  icon,
  invalid,
  className,
  onClear,
  ...props
}: InputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Controlled inputs only: a clear button makes no sense on an uncontrolled
  // input since there is no value to clear from the parent. All current
  // onClear consumers are controlled.
  // ponytail: add internal value-tracking only if an uncontrolled clearable
  // input ever lands.
  const hasValue = props.value !== undefined && props.value !== '';
  const showClear = Boolean(onClear) && hasValue && !props.disabled;

  function handleClear() {
    onClear?.();
    inputRef.current?.focus();
  }

  const inputClassName = cn(
    'bg-white',
    icon && 'pl-10',
    showClear && 'pr-9',
    invalid && 'border-destructive focus-visible:ring-destructive/30',
  );

  if (!icon && !showClear) {
    return (
      <ShadcnInput
        ref={inputRef}
        className={cn(inputClassName, className)}
        {...props}
      />
    );
  }

  return (
    <div className={cn('relative', className)}>
      {icon && (
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </div>
      )}
      <ShadcnInput ref={inputRef} className={inputClassName} {...props} />
      {showClear && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

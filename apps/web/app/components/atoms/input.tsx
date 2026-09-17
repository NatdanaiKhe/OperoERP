import * as React from 'react';
import { X } from 'lucide-react';
import { Input as ShadcnInput } from '@/app/components/ui/input';
import { cn } from '@/app/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  invalid?: boolean;
  onClear?: () => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { icon, invalid = false, onClear, value, className, disabled, ...props },
    forwardedRef,
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    const setInputRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;

        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef],
    );

    const hasValue = value !== undefined && value !== '';
    const showClear = Boolean(onClear) && hasValue && !disabled;

    const handleClear = () => {
      onClear?.();
      inputRef.current?.focus();
    };

    const inputClassName = cn(
      'bg-white',
      icon && 'pl-10',
      showClear && 'pr-9',
      invalid && 'border-destructive focus-visible:ring-destructive/30',
      className,
    );

    if (!icon && !showClear) {
      return (
        <ShadcnInput
          ref={setInputRef}
          value={value}
          disabled={disabled}
          className={inputClassName}
          {...props}
        />
      );
    }

    return (
      <div className="relative">
        {icon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {icon}
          </span>
        )}

        <ShadcnInput
          ref={setInputRef}
          value={value}
          disabled={disabled}
          className={inputClassName}
          {...props}
        />

        {showClear && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear input"
            title="Clear"
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2',
              'text-muted-foreground transition-colors',
              'hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-ring focus-visible:ring-offset-2',
            )}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

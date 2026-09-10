import { Label } from '@/app/components/atoms/label';
import type { FieldProps } from './field.types';

export function Field({ htmlFor, label, children }: FieldProps) {
  return (
    <div>
      <Label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

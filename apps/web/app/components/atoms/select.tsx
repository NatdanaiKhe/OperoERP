import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { cn } from '@/app/lib/utils';
import type { SelectProps } from './select.types';

export type { SelectOption, SelectProps } from './select.types';

export function Select({
  value,
  placeholder,
  options,
  onValueChange,
  id,
  disabled,
  className,
}: SelectProps) {
  return (
    <ShadcnSelect
      value={value || undefined}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={cn('bg-white', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </ShadcnSelect>
  );
}

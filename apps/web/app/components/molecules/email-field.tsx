'use client';

import { Mail } from 'lucide-react';
import { Input } from '@/app/components/atoms/input';
import { Label } from '@/app/components/ui/label';

interface EmailFieldProps {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
}

export function EmailField({
  value,
  onChange,
  invalid,
  disabled,
  id = 'email',
}: EmailFieldProps) {
  return (
    <div>
      <Label
        htmlFor={id}
        className="text-label-md mb-1.5 block font-mono uppercase text-muted-foreground"
      >
        Email
      </Label>
      <Input
        id={id}
        type="email"
        icon={<Mail className="h-5 w-5" />}
        placeholder="you@company.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        invalid={invalid}
        disabled={disabled}
        autoComplete="email"
        required
      />
    </div>
  );
}

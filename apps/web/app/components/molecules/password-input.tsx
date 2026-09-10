'use client';

import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/app/components/atoms/input';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
}

export function PasswordInput({
  value,
  onChange,
  placeholder = 'Enter your password',
  id = 'password',
  invalid,
  disabled,
  autoComplete,
  autoFocus,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        icon={<Lock className="h-5 w-5" />}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        invalid={invalid}
        disabled={disabled}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}

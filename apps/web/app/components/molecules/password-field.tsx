'use client';

import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/app/components/atoms/input';
import { Label } from '@/app/components/ui/label';
import { TextLink } from '@/app/components/atoms/text-link';

interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
}

export function PasswordField({
  value,
  onChange,
  invalid,
  disabled,
  id = 'password',
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Label
          htmlFor={id}
          className="text-label-md font-mono uppercase text-muted-foreground"
        >
          Password
        </Label>
        <TextLink href="/forgot-password" className="text-xs font-normal">
          Forgot password?
        </TextLink>
      </div>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          icon={<Lock className="h-5 w-5" />}
          placeholder="Enter your password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          invalid={invalid}
          disabled={disabled}
          autoComplete="current-password"
          required
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}

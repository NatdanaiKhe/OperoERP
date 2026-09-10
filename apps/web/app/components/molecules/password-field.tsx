'use client';

import { Label } from '@/app/components/atoms/label';
import { TextLink } from '@/app/components/atoms/text-link';
import { PasswordInput } from '@/app/components/molecules/password-input';
import type { PasswordFieldProps } from './password-field.types';

export function PasswordField({
  value,
  onChange,
  invalid,
  disabled,
  id = 'password',
}: PasswordFieldProps) {
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
      <PasswordInput
        id={id}
        value={value}
        onChange={onChange}
        invalid={invalid}
        disabled={disabled}
        autoComplete="current-password"
      />
    </div>
  );
}

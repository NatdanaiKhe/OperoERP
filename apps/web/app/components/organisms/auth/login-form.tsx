'use client';

import { useState } from 'react';
import { EmailField } from '@/app/components/molecules/email-field';
import { PasswordField } from '@/app/components/molecules/password-field';
import { Button } from '@/app/components/atoms/button';
import { apiErrorMessage } from '@/app/lib/api-client';
import { useLogin } from '@/app/features/auth/hooks';
import { FormAlert } from '@/app/components/molecules/form-alert';
import { EMAIL_REGEX } from '@/app/lib/utils';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const { mutateAsync: loginMutate, isPending, error } = useLogin();

  function validate(): string | null {
    if (!email.trim()) return 'Email is required.';
    if (!EMAIL_REGEX.test(email)) return 'Enter a valid email address.';
    if (!password) return 'Password is required.';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    const err = validate();
    if (err) {
      setValidationError(err);
      return;
    }

    try {
      await loginMutate({ email, password });
    } catch {
      // ApiError is surfaced via mutation `error` — swallow to prevent unhandled rejection
    }
  }

  const displayError =
    validationError ??
    (error ? apiErrorMessage(error, 'Something went wrong. Please try again.') : null);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {displayError && <FormAlert>{displayError}</FormAlert>}
      <EmailField
        value={email}
        onChange={setEmail}
        invalid={!!validationError && !email.trim()}
        disabled={isPending}
      />
      <PasswordField
        value={password}
        onChange={setPassword}
        invalid={!!validationError && !password}
        disabled={isPending}
      />
      <Button type="submit" fullWidth loading={isPending} loadingText="Signing in...">
        Sign In
      </Button>
    </form>
  );
}

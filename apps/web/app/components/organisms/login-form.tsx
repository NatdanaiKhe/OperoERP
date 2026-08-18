'use client';

import { useState } from 'react';
import { EmailField } from '@/app/components/molecules/email-field';
import { PasswordField } from '@/app/components/molecules/password-field';
import { Button } from '@/app/components/atoms/button';
import { ApiError } from '@/app/lib/api-client';
import { useLogin } from '@/app/features/auth/hooks';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const displayError = validationError
    ?? (error instanceof ApiError
      ? error.message
      : error
        ? 'Something went wrong. Please try again.'
        : null);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {displayError && (
        <div
          role="alert"
          className="rounded border border-error/30 bg-error/5 px-3 py-2 text-sm text-error"
        >
          {displayError}
        </div>
      )}
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
      <Button type="submit" fullWidth loading={isPending}>
        Sign In
      </Button>
    </form>
  );
}

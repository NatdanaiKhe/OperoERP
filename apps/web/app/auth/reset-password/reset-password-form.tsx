'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/app/components/atoms/button';
import { Field } from '@/app/components/molecules/field';
import { PasswordInput } from '@/app/components/molecules/password-input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/atoms/card';
import { AuthTemplate } from '@/app/components/templates/auth-template';
import { apiFetch, apiErrorMessage } from '@/app/lib/api-client';
import { Logo } from '@/app/components/atoms/logo';
import { FormAlert } from '@/app/components/molecules/form-alert';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError('Invalid reset link.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
        skipAuth: true,
      });
      router.push('/login');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthTemplate>
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-4">
            <Logo size="md" />
          </div>
          <CardTitle>Set New Password</CardTitle>
          <CardDescription>
            Choose a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && <FormAlert>{error}</FormAlert>}
            <Field htmlFor="password" label="New Password">
              <PasswordInput
                id="password"
                value={password}
                onChange={setPassword}
                placeholder="Enter new password"
                autoFocus
              />
            </Field>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthTemplate>
  );
}

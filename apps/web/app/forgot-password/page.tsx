'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/app/components/atoms/button';
import { Input } from '@/app/components/atoms/input';
import { Field } from '@/app/components/molecules/field';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/atoms/card';
import { AuthTemplate } from '@/app/components/templates/auth-template';
import { apiFetch, apiErrorMessage } from '@/app/lib/api-client';
import { Logo } from '@/app/components/atoms/logo';
import { FormAlert } from '@/app/components/molecules/form-alert';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
        skipAuth: true,
      });
      setSubmitted(true);
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
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            {submitted
              ? 'If the email exists, a reset link has been sent.'
              : 'Enter your email and we will send you a reset link.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <p className="text-center text-sm text-muted-foreground">
              Check your inbox for the reset link.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && <FormAlert>{error}</FormAlert>}
              <Field htmlFor="email" label="Email">
                <Input
                  id="email"
                  type="email"
                  icon={<Mail className="h-5 w-5" />}
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </Field>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthTemplate>
  );
}

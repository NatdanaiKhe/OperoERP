'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/app/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/atoms/card';
import { Input } from '@/app/components/atoms/input';
import { Label } from '@/app/components/ui/label';
import { useProfile } from '@/app/features/auth/hooks';
import { useCompany, useUpdateCompany } from '@/app/features/company/hooks';
import type { Company, UpdateCompanyPayload } from '@/app/features/company/types';
import { ApiError } from '@/app/lib/api-client';

function CompanySettings() {
  const { data: profile } = useProfile();
  const companyId = profile?.companyId ?? null;
  const { data: company, isLoading } = useCompany(companyId);
  const { mutateAsync: updateCompany, isPending, error, isSuccess } =
    useUpdateCompany(companyId ?? '');
  const [form, setForm] = useState<Partial<Company>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (company) setForm(company);
  }, [company]);

  if (isLoading) {
    return <Card className="h-48 animate-pulse bg-muted/50" />;
  }

  if (!company) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No company is associated with your account.
        </CardContent>
      </Card>
    );
  }

  function set<K extends keyof Company>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_REGEX = /^[+\d][\d\s().-]{6,19}$/;

  function validate(): string | null {
    const name = (form.name ?? '').trim();
    if (!name) return 'Company name is required.';
    if (name.length > 255) return 'Company name must be 255 characters or fewer.';
    if (form.email && !EMAIL_REGEX.test(form.email.trim())) {
      return 'Enter a valid company email address.';
    }
    if (form.phone && !PHONE_REGEX.test(form.phone.trim())) {
      return 'Enter a valid phone number.';
    }
    if (form.website && !/^https?:\/\/.+/.test(form.website.trim())) {
      return 'Website must start with http:// or https://.';
    }
    return null;
  }

  async function handleSave() {
    setValidationError(null);
    const err = validate();
    if (err) {
      setValidationError(err);
      return;
    }
    const payload = Object.fromEntries(
      Object.entries(form)
        .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
        .filter(([, v]) => v !== null && v !== ''),
    ) as UpdateCompanyPayload;
    await updateCompany(payload);
  }

  const displayError =
    validationError
    ?? (error instanceof ApiError
      ? error.message
      : error
        ? 'Something went wrong. Please try again.'
        : null);

  const fields: { key: keyof Company; label: string; fullWidth?: boolean }[] = [
    { key: 'name', label: 'Company Name' },
    { key: 'description', label: 'Description', fullWidth: true },
    { key: 'email', label: 'Email Address' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'website', label: 'Website' },
    { key: 'addressLine1', label: 'Address Line 1' },
    { key: 'addressLine2', label: 'Address Line 2' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State / Province' },
    { key: 'postalCode', label: 'Postal Code' },
    { key: 'country', label: 'Country' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Company Information</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Your organization's public details and contact information
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(({ key, label, fullWidth }) => (
            <div key={key} className={`space-y-2 ${fullWidth ? 'sm:col-span-2' : ''}`}>
              <Label htmlFor={`company-${key}`}>{label}</Label>
              <Input
                id={`company-${key}`}
                value={form[key] ?? ''}
                onChange={(e) => set(key, e.target.value)}
              />
            </div>
          ))}
        </div>

        {displayError && (
          <div
            role="alert"
            className="rounded border border-error/30 bg-error/5 px-3 py-2 text-sm text-error"
          >
            {displayError}
          </div>
        )}
        {isSuccess && !displayError && (
          <p className="text-sm text-success">Company saved.</p>
        )}

        <div className="flex justify-end">
          <Button type="button" disabled={isPending} onClick={handleSave}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default CompanySettings;

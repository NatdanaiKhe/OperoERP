'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/app/components/atoms/button';
import { Input } from '@/app/components/atoms/input';
import { Textarea } from '@/app/components/atoms/textarea';
import { Field } from '@/app/components/molecules/field';
import { FormAlert } from '@/app/components/molecules/form-alert';
import { apiErrorMessage, ApiError } from '@/app/lib/api-client';
import {
  useCreateCustomer,
  useUpdateCustomer,
} from '@/app/features/customer/hooks';
import type { CustomerPayload } from '@/app/features/customer/types';
import type { CustomerFormProps } from './customer-form.types';
import z from 'zod';

const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Company name is required.')
    .max(255, 'Company name is too long.'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .email('Enter a valid email address.'),
  contactPerson: z
    .string()
    .trim()
    .max(255, 'Contact person is too long.')
    .optional()
    .default(''),
  phone: z.string().trim().max(50, 'Phone number is too long.').optional().default(''),
  address: z
    .string()
    .trim()
    .max(500, 'Address is too long.')
    .optional()
    .default(''),
  taxId: z.string().trim().max(50, 'Tax ID is too long.').optional().default(''),
  notes: z
    .string()
    .trim()
    .max(2000, 'Notes are too long.')
    .optional()
    .default(''),
});

export function CustomerForm({ initial }: CustomerFormProps) {
  const router = useRouter();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [contactPerson, setContactPerson] = useState(
    initial?.contactPerson ?? '',
  );
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [taxId, setTaxId] = useState(initial?.taxId ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const createMut = useCreateCustomer();
  const updateMut = useUpdateCustomer();
  const isPending = isEdit ? updateMut.isPending : createMut.isPending;

  const error = isEdit ? updateMut.error : createMut.error;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setValidationError(null);
    setEmailError(null);

    const validation = customerSchema.safeParse({
      name,
      email,
      contactPerson,
      phone,
      address,
      taxId,
      notes,
    });
    if (!validation.success) {
      setValidationError(validation.error.issues[0].message);
      return;
    }

    const payload: CustomerPayload = {
      name: validation.data.name,
      email: validation.data.email,
      contactPerson: validation.data.contactPerson || undefined,
      phone: validation.data.phone || undefined,
      address: validation.data.address || undefined,
      taxId: validation.data.taxId || undefined,
      notes: validation.data.notes || undefined,
    };

    try {
      if (isEdit && initial) {
        await updateMut.mutateAsync({ id: initial.id, payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      router.push('/dashboard/customers?saved=1');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setEmailError(err.message);
      } else {
        setValidationError(apiErrorMessage(err));
      }
    }
  }

  const displayError =
    validationError ?? (error ? apiErrorMessage(error) : null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <button
          onClick={() => router.push('/dashboard/customers')}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Customers
        </button>
        <h1 className="text-2xl font-semibold text-foreground">
          {isEdit ? 'Edit Customer' : 'Add Customer'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isEdit
            ? 'Update this customer record.'
            : 'Create a new customer record.'}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-6 rounded-lg border border-border/30 bg-card p-6"
      >
        {displayError && <FormAlert>{displayError}</FormAlert>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field htmlFor="customer-name" label={<>Company Name <span className="text-destructive">*</span></>}>
            <Input
              id="customer-name"
              placeholder="e.g. Acme Corp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
          </Field>
          <Field htmlFor="customer-contact" label="Contact Person">
            <Input
              id="customer-contact"
              placeholder="Full Name"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              disabled={isPending}
            />
          </Field>
        </div>

        <Field htmlFor="customer-email" label={<>Email <span className="text-destructive">*</span></>}>
          <Input
            id="customer-email"
            type="email"
            placeholder="contact@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
          />
          {emailError && (
            <p className="mt-1.5 text-sm text-destructive">{emailError}</p>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field htmlFor="customer-phone" label="Phone Number">
            <Input
              id="customer-phone"
              placeholder="555-0123"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isPending}
            />
          </Field>
          <Field htmlFor="customer-tax" label="Tax ID">
            <Input
              id="customer-tax"
              placeholder="XX-XXXXXXX"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              disabled={isPending}
            />
          </Field>
        </div>

        <Field htmlFor="customer-address" label="Address">
          <Textarea
            id="customer-address"
            rows={2}
            placeholder="Street, City, State/Province, ZIP/Postal Code"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={isPending}
          />
        </Field>

        <Field htmlFor="customer-notes" label="Notes">
          <Textarea
            id="customer-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isPending}
          />
        </Field>

        <div className="flex justify-end gap-3 border-t border-border/30 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/customers')}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? 'Saving...'
              : isEdit
                ? 'Save Changes'
                : 'Save Customer'}
          </Button>
        </div>
      </form>
    </div>
  );
}

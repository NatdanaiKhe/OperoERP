'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/app/components/atoms/button';
import { Input } from '@/app/components/atoms/input';
import { Select } from '@/app/components/atoms/select';
import { Field } from '@/app/components/molecules/field';
import { DialogShell } from '@/app/components/molecules/dialog-shell';
import { FormAlert } from '@/app/components/molecules/form-alert';
import { apiErrorMessage } from '@/app/lib/api-client';
import { useInviteUser } from '@/app/features/users/hooks';
import { useRoles } from '@/app/features/roles/hooks';
import { useDepartments } from '@/app/features/department/hooks';
import { formatName } from '@/app/lib/format';
import type { InviteDialogProps } from './invite-dialog.types';
import z from 'zod';

export function InviteDialog({ open, onClose }: InviteDialogProps) {
  const {
    data: roles,
    isLoading: isRolesLoading,
    isError: isRolesError,
  } = useRoles();
  const {
    data: departments,
    isLoading: isDepartmentsLoading,
    isError: isDepartmentsError,
  } = useDepartments();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [role, setRole] = useState<string>('user');
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    mutateAsync: inviteMutate,
    isPending,
    error,
    reset,
  } = useInviteUser();

  useEffect(() => {
    if (!open) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setDepartmentId('');
      setRole('');
      setValidationError(null);
      reset();
    }
  }, [open, reset]);

  if (!open) return null;

  const referenceDataError = isRolesError || isDepartmentsError;
  const referenceDataLoading = isRolesLoading || isDepartmentsLoading;

  const inviteUserSchema = z.object({
    firstName: z.string().trim().min(1, 'First name is required.'),
    lastName: z.string().trim().min(1, 'Last name is required.'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required.')
      .email('Enter a valid email address.'),
    departmentId: z.string().min(1, 'Department is required.'),
    role: z.string().min(1, 'Role is required.'),
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setValidationError(null);
    const validation = inviteUserSchema.safeParse({
      firstName,
      lastName,
      email,
      departmentId,
      role,
    });

    if (!validation.success) {
      setValidationError(validation.error.issues[0].message);
      return;
    }

    try {
      await inviteMutate({
        firstName,
        lastName,
        email,
        departmentId,
        role,
      });
      onClose();
    } catch {
      // ApiError surfaced via mutation `error`
    }
  }

  const roleOptions = (roles ?? []).map((r) => ({
    value: r.name,
    label: formatName(r.name),
  }));

  const departmentOptions = (departments ?? []).map((d) => ({
    value: d.id,
    label: formatName(d.name),
  }));

  const displayError =
    validationError ??
    (error
      ? apiErrorMessage(error)
      : referenceDataError
        ? 'Failed to load roles or departments. Please try again.'
        : null);

  const formDisabled = isPending || referenceDataLoading || referenceDataError;

  return (
    <DialogShell title="Invite User" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {displayError && <FormAlert>{displayError}</FormAlert>}

        <div className="grid grid-cols-2 gap-4">
          <Field htmlFor="invite-firstName" label="First Name">
            <Input
              id="invite-firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isPending}
            />
          </Field>
          <Field htmlFor="invite-lastName" label="Last Name">
            <Input
              id="invite-lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isPending}
            />
          </Field>
        </div>

        <Field htmlFor="invite-email" label="Email">
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
          />
        </Field>

        <Field htmlFor="invite-department" label="Department">
          <Select
            id="invite-department"
            value={departmentId}
            onValueChange={setDepartmentId}
            disabled={formDisabled}
            placeholder={
              isDepartmentsLoading
                ? 'Loading departments...'
                : 'Select a department'
            }
            options={departmentOptions}
          />
        </Field>

        <Field htmlFor="invite-role" label="Role">
          <Select
            id="invite-role"
            value={role}
            onValueChange={setRole}
            disabled={formDisabled}
            placeholder={
              isDepartmentsLoading ? 'Loading roles...' : 'Select a role'
            }
            options={roleOptions}
          />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={formDisabled}>
            {isPending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}

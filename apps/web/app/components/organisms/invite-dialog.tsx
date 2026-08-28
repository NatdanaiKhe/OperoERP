'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { ApiError } from '@/app/lib/api-client';
import { useInviteUser } from '@/app/features/users/hooks';
import { useRoles } from '@/app/features/roles/hooks';
import { useDepartments } from '@/app/features/department/hooks';
import { formatName } from '@/app/lib/utils';
import z from 'zod';

interface InviteDialogProps {
  open: boolean;
  onClose: () => void;
}

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
    console.log('🚀 ~ handleSubmit ~ role:', role);
    console.log('🚀 ~ handleSubmit ~ departmentId:', departmentId);
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

  const roleOptions = roles?.map((r) => (
    <option key={r.id} value={r.name}>
      {formatName(r.name)}
    </option>
  ));

  const departmentOptions = departments?.map((d) => (
    <option key={d.id} value={d.id}>
      {formatName(d.name)}
    </option>
  ));

  const displayError =
    validationError ??
    (error instanceof ApiError
      ? error.message
      : error
        ? 'Something went wrong.'
        : referenceDataError
          ? 'Failed to load roles or departments. Please try again.'
          : null);

  const formDisabled = isPending || referenceDataLoading || referenceDataError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Invite User</h2>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {displayError && (
            <div
              role="alert"
              className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {displayError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="invite-firstName"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                First Name
              </Label>
              <Input
                id="invite-firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div>
              <Label
                htmlFor="invite-lastName"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Last Name
              </Label>
              <Input
                id="invite-lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="invite-email"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Email
            </Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div>
            <Label
              htmlFor="invite-department"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Department
            </Label>
            <select
              id="invite-department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              disabled={formDisabled}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>
                {isDepartmentsLoading
                  ? 'Loading departments...'
                  : 'Select a department'}
              </option>
              {departmentOptions}
            </select>
          </div>

          <div>
            <Label
              htmlFor="invite-role"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Role
            </Label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={formDisabled}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>
                {isDepartmentsLoading ? 'Loading roles...' : 'Select a role'}
              </option>
              {roleOptions}
            </select>
          </div>

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
      </div>
    </div>
  );
}

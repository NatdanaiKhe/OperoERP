'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { ApiError } from '@/app/lib/api-client';
import { useUpdateUser } from '@/app/features/users/hooks';
import { useRoles } from '@/app/features/roles/hooks';
import { useDepartments } from '@/app/features/department/hooks';
import { formatName } from '@/app/lib/utils';
import type { User } from '@/app/features/users/types';
import z from 'zod';

interface EditUserDialogProps {
  user: User | null;
  onClose: () => void;
}

export function EditUserDialog({ user, onClose }: EditUserDialogProps) {
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

  const [departmentId, setDepartmentId] = useState('');
  const [role, setRole] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    mutateAsync: updateMutate,
    isPending,
    error,
    reset,
  } = useUpdateUser();

  useEffect(() => {
    if (user) {
      setDepartmentId(user.department?.id ?? '');
      setRole(user.roles[0] ?? '');
      setValidationError(null);
      reset();
    }
  }, [user, reset]);

  if (!user) return null;
  const currentUser = user;

  const referenceDataError = isRolesError || isDepartmentsError;
  const referenceDataLoading = isRolesLoading || isDepartmentsLoading;

  const editUserSchema = z.object({
    departmentId: z.string().min(1, 'Department is required.'),
    role: z.string().min(1, 'Role is required.'),
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setValidationError(null);
    const validation = editUserSchema.safeParse({ departmentId, role });
    if (!validation.success) {
      setValidationError(validation.error.issues[0].message);
      return;
    }

    try {
      await updateMutate({
        id: currentUser.id,
        payload: { departmentId, role },
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
          <h2 className="text-lg font-semibold text-foreground">
            Edit User
          </h2>
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

          <div>
            <Label
              htmlFor="edit-department"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Department
            </Label>
            <select
              id="edit-department"
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
              htmlFor="edit-role"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Role
            </Label>
            <select
              id="edit-role"
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
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

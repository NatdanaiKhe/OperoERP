'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/app/components/atoms/button';
import { Select } from '@/app/components/atoms/select';
import { Field } from '@/app/components/molecules/field';
import { DialogShell } from '@/app/components/molecules/dialog-shell';
import { FormAlert } from '@/app/components/molecules/form-alert';
import { apiErrorMessage } from '@/app/lib/api-client';
import { useUpdateUser } from '@/app/features/users/hooks';
import { useRoles } from '@/app/features/roles/hooks';
import { useDepartments } from '@/app/features/department/hooks';
import { formatName } from '@/app/lib/format';
import type { EditUserDialogProps } from './edit-user-dialog.types';
import z from 'zod';

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
    <DialogShell title="Edit User" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {displayError && <FormAlert>{displayError}</FormAlert>}

        <Field htmlFor="edit-department" label="Department">
          <Select
            id="edit-department"
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

        <Field htmlFor="edit-role" label="Role">
          <Select
            id="edit-role"
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
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}

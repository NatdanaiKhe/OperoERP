'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { ApiError } from '@/app/lib/api-client';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useReassignDepartmentUsers,
} from '@/app/features/department/hooks';
import { useProfile } from '@/app/features/auth/hooks';
import type { Department } from '@/app/features/department/types';

function errMsg(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong.';
}

export default function DepartmentsPage() {
  const { data: departments, isLoading, isError } = useDepartments();
  const { data: profile } = useProfile();
  const router = useRouter();

  const menuConfig = profile?.menuConfig ?? [];
  // Same permission level as User Management (admin/superadmin).
  const canAccess = menuConfig.includes('department_management');

  useEffect(() => {
    if (profile && !canAccess) {
      router.replace('/dashboard');
    }
  }, [profile, canAccess, router]);

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Blocked-delete reassignment flow state.
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [blockedCount, setBlockedCount] = useState(0);
  const [targetDept, setTargetDept] = useState('');

  const createMut = useCreateDepartment();
  const updateMut = useUpdateDepartment();
  const deleteMut = useDeleteDepartment();
  const reassignMut = useReassignDepartmentUsers();

  if (profile && !canAccess) {
    return null;
  }

  const companyId = profile?.companyId ?? null;
  const otherDepartments =
    departments?.filter((d) => d.id !== deleteTarget?.id) ?? [];

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!companyId || !newName.trim()) return;
    try {
      await createMut.mutateAsync({ name: newName.trim(), companyId });
      setNewName('');
    } catch (err) {
      setError(errMsg(err));
    }
  }

  function startEdit(dept: Department) {
    setEditingId(dept.id);
    setEditName(dept.name);
  }

  async function handleRename(dept: Department) {
    setError(null);
    const name = editName.trim();
    if (!name || name === dept.name) {
      setEditingId(null);
      return;
    }
    try {
      await updateMut.mutateAsync({ id: dept.id, payload: { name } });
      setEditingId(null);
    } catch (err) {
      setError(errMsg(err));
    }
  }

  async function handleDelete(dept: Department) {
    setError(null);
    try {
      await deleteMut.mutateAsync(dept.id);
    } catch (err) {
      const count =
        err instanceof ApiError &&
        typeof err.body === 'object' &&
        err.body !== null &&
        'affectedUserCount' in err.body
          ? (err.body as { affectedUserCount: number }).affectedUserCount
          : null;
      if (err instanceof ApiError && count !== null) {
        setDeleteTarget(dept);
        setBlockedCount(count);
        setTargetDept('');
      } else {
        setError(errMsg(err));
      }
    }
  }

  async function handleReassignAndDelete(e: FormEvent) {
    e.preventDefault();
    if (!deleteTarget || !targetDept) return;
    setError(null);
    try {
      await reassignMut.mutateAsync({
        fromId: deleteTarget.id,
        toId: targetDept,
      });
      await deleteMut.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setError(errMsg(err));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Department Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create, rename, and remove departments.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="flex max-w-md items-end gap-3">
        <div className="flex-1">
          <label
            htmlFor="new-department"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            New Department
          </label>
          <Input
            id="new-department"
            placeholder="e.g. Engineering"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={createMut.isPending || !companyId}
          />
        </div>
        <Button type="submit" disabled={createMut.isPending || !companyId}>
          <Plus className="h-4 w-4" />
          Create
        </Button>
      </form>

      {isError ? (
        <p className="text-sm text-destructive">
          Failed to load departments. Please try again.
        </p>
      ) : isLoading ? (
        <div className="overflow-hidden rounded-lg border border-border/30 bg-card">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse border-b border-border/30 bg-muted/50"
            />
          ))}
        </div>
      ) : departments && departments.length === 0 ? (
        <div className="rounded-lg border border-border/30 bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No departments yet. Create one above.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/30 bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30 bg-secondary">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {departments?.map((dept) => (
                <tr
                  key={dept.id}
                  className="transition-colors hover:bg-secondary/50"
                >
                  <td className="px-4 py-2.5">
                    {editingId === dept.id ? (
                      <div className="flex max-w-sm items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleRename(dept)}
                          disabled={updateMut.isPending}
                          aria-label="Save name"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                          aria-label="Cancel rename"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-foreground">
                        {dept.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(dept)}
                        disabled={editingId !== null}
                        aria-label={`Rename ${dept.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Rename
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(dept)}
                        disabled={deleteMut.isPending}
                        className="text-destructive hover:text-destructive"
                        aria-label={`Delete ${dept.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Blocked-delete reassignment dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDeleteTarget(null)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">
              Department in use
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {blockedCount}
              </span>{' '}
              active user(s) are assigned to “{deleteTarget.name}”. Reassign
              them to another department to delete it.
            </p>

            <form onSubmit={handleReassignAndDelete} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="reassign-target"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Move users to
                </label>
                <select
                  id="reassign-target"
                  value={targetDept}
                  onChange={(e) => setTargetDept(e.target.value)}
                  disabled={reassignMut.isPending}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>
                    Select a department
                  </option>
                  {otherDepartments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteTarget(null)}
                  disabled={reassignMut.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!targetDept || reassignMut.isPending}
                >
                  {reassignMut.isPending
                    ? 'Reassigning...'
                    : 'Reassign & Delete'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

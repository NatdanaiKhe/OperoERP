'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { ApiError } from '@/app/lib/api-client';
import { useInviteUser } from '@/app/features/users/hooks';

const ROLES = [
  'admin',
  'manager',
  'user',
  'sales_representative',
  'sales_manager',
  'warehouse_staff',
  'accountant',
] as const;

interface InviteDialogProps {
  open: boolean;
  onClose: () => void;
}

export function InviteDialog({ open, onClose }: InviteDialogProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<string>('user');
  const [validationError, setValidationError] = useState<string | null>(null);

  const { mutateAsync: inviteMutate, isPending, error, reset } = useInviteUser();

  useEffect(() => {
    if (!open) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setDepartment('');
      setRole('user');
      setValidationError(null);
      reset();
    }
  }, [open, reset]);

  if (!open) return null;

  function validate(): string | null {
    if (!firstName.trim()) return 'First name is required.';
    if (!lastName.trim()) return 'Last name is required.';
    if (!email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
    if (!department.trim()) return 'Department is required.';
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
      await inviteMutate({ firstName, lastName, email, department, role });
      onClose();
    } catch {
      // ApiError surfaced via mutation `error`
    }
  }

  const displayError = validationError
    ?? (error instanceof ApiError ? error.message : error ? 'Something went wrong.' : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
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
            <div role="alert" className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {displayError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invite-firstName" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                First Name
              </Label>
              <Input
                id="invite-firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isPending}
                placeholder="Jane"
              />
            </div>
            <div>
              <Label htmlFor="invite-lastName" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Last Name
              </Label>
              <Input
                id="invite-lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isPending}
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="invite-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Email
            </Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              placeholder="jane@company.com"
            />
          </div>

          <div>
            <Label htmlFor="invite-department" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Department
            </Label>
            <Input
              id="invite-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={isPending}
              placeholder="Sales"
            />
          </div>

          <div>
            <Label htmlFor="invite-role" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Role
            </Label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isPending}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

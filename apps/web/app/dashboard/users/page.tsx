'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Search } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { UserTable } from '@/app/components/organisms/user-table';
import { InviteDialog } from '@/app/components/organisms/invite-dialog';
import { useUsers } from '@/app/features/users/hooks';
import { useProfile } from '@/app/features/auth/hooks';

export default function UsersPage() {
  const { data: users, isLoading, isError } = useUsers();
  const { data: profile } = useProfile();
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState('');

  const menuConfig = profile?.menuConfig ?? [];
  const canAccess = menuConfig.includes('user_management');

  useEffect(() => {
    if (profile && !canAccess) {
      router.replace('/dashboard');
    }
  }, [profile, canAccess, router]);

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter((u) =>
      [
        u.firstName,
        u.lastName,
        u.email,
        u.username,
        u.department?.name,
        ...u.roles,
      ]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [users, search]);

  if (profile && !canAccess) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            User Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage user accounts, roles, and invitations.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isError ? (
        <p className="text-sm text-destructive">
          Failed to load users. Please try again.
        </p>
      ) : (
        <UserTable users={filtered} isLoading={isLoading} />
      )}

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

'use client';

import { Avatar } from '@/app/components/atoms/avatar';
import { Badge } from '@/app/components/atoms/badge';
import { User } from '@/app/features/users/types';

interface UserTableProps {
  users: User[];
  isLoading: boolean;
}

export function UserTable({ users, isLoading }: UserTableProps) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-border/30 bg-card">
        <div className="border-b border-border/30 bg-secondary px-4 py-3">
          <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="border-b border-border/30 px-4 py-3">
            <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-4">
              <div className="h-8 animate-pulse rounded bg-muted" />
              <div className="h-8 animate-pulse rounded bg-muted" />
              <div className="h-8 animate-pulse rounded bg-muted" />
              <div className="h-8 animate-pulse rounded bg-muted" />
              <div className="h-8 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-border/30 bg-card">
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">
          No users found.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/30 bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/30 bg-secondary">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Name
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Email
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Department
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Role
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {users.map((user) => (
            <tr
              key={user.id}
              className="transition-colors hover:bg-secondary/50"
            >
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={
                      `${user.firstName} ${user.lastName}`.trim() ||
                      user.username
                    }
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {`${user.firstName} ${user.lastName}`.trim() ||
                        user.username}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.username}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-2.5">
                <span className="font-mono text-sm text-foreground">
                  {user.email}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <span className="text-sm text-foreground">
                  {user.department?.name ?? '—'}
                </span>
              </td>
              <td className="px-4 py-2.5">
                {user.roles.length > 0 ? (
                  <Badge variant="secondary">{user.roles[0]}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-2.5">
                {user.isActive ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="warning">Pending</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

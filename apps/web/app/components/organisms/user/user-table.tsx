'use client';

import { Pencil } from 'lucide-react';
import { Avatar } from '@/app/components/atoms/avatar';
import { Badge } from '@/app/components/atoms/badge';
import { Button } from '@/app/components/atoms/button';
import {
  Table,
  TableHead,
  TableHeaderRow,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/app/components/atoms/table';
import {
  TableSkeleton,
  TableEmpty,
} from '@/app/components/molecules/table-placeholder';
import type { UserTableProps } from './user-table.types';

export function UserTable({ users, isLoading, onEdit }: UserTableProps) {
  if (isLoading) {
    return (
      <TableSkeleton
        rows={5}
        columns={5}
        gridClassName="grid-cols-[2fr_2fr_1fr_1fr_1fr]"
      />
    );
  }

  if (users.length === 0) {
    return <TableEmpty>No users found.</TableEmpty>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/30 bg-card">
      <Table>
        <TableHead>
          <TableHeaderRow>
            <TableHeader>Name</TableHeader>
            <TableHeader>Email</TableHeader>
            <TableHeader>Department</TableHeader>
            <TableHeader>Role</TableHeader>
            <TableHeader>Status</TableHeader>
            {onEdit && <TableHeader className="text-right">Actions</TableHeader>}
          </TableHeaderRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
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
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm text-foreground">
                  {user.email}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-foreground">
                  {user.department?.name ?? '—'}
                </span>
              </TableCell>
              <TableCell>
                {user.roles.length > 0 ? (
                  <Badge variant="secondary">{user.roles[0]}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {user.isActive ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="warning">Pending</Badge>
                )}
              </TableCell>
              {onEdit && (
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(user)}
                    aria-label={`Edit ${user.firstName} ${user.lastName}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

'use client';

import { Badge } from '@/app/components/atoms/badge';
import { Card } from '@/app/components/atoms/card';
import {
  Table,
  TableHead,
  TableHeaderRow,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/app/components/atoms/table';
import { formatName } from '@/app/lib/format';
import { useRoles, useUpdateMenuConfig } from '@/app/features/roles/hooks';
import type { RoleWithMenu } from '@/app/features/roles/types';

const MENU_LABELS: { key: string; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'user_management', label: 'User Management' },
  { key: 'customers', label: 'Customers' },
  { key: 'products', label: 'Products' },
  { key: 'sales', label: 'Sales' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'reports', label: 'Reports' },
  { key: 'quick_action', label: 'Quick Action' },
];

function MenuVisibilitySettings() {
  const { data: roles, isLoading } = useRoles();
  const { mutateAsync: updateConfig, isPending } = useUpdateMenuConfig();

  async function handleToggle(
    roleId: string,
    menuKey: string,
    currentVisible: boolean,
  ) {
    // Toggle one key: send the full list for that role with the toggled value.
    const role = roles?.find((r) => r.id === roleId);
    if (!role) return;
    const items = MENU_LABELS.map((m) => {
      const existing = role.menuVisibility.find((mv) => mv.menuKey === m.key);
      if (m.key === menuKey) {
        return { menuKey: m.key, visible: !currentVisible };
      }
      return { menuKey: m.key, visible: existing?.visible ?? false };
    });
    await updateConfig({ roleId, payload: { items } });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure which menu items each role can see. All items are hidden by
        default.
      </p>

      {isLoading ? (
        <Card className="h-96 animate-pulse bg-muted/50" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/30 bg-card">
          <Table>
            <TableHead>
              <TableHeaderRow>
                <TableHeader>Role</TableHeader>
                {MENU_LABELS.map((m) => (
                  <TableHeader key={m.key} className="text-center">
                    {m.label}
                  </TableHeader>
                ))}
              </TableHeaderRow>
            </TableHead>
            <TableBody>
              {roles?.map((role: RoleWithMenu) => (
                <TableRow key={role.id}>
                  <TableCell className="py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {formatName(role.name)}
                      </span>
                      {role.description && (
                        <span className="text-xs text-muted-foreground">{role.description}</span>
                      )}
                    </div>
                  </TableCell>
                  {MENU_LABELS.map((m) => {
                    const mv = role.menuVisibility.find((v) => v.menuKey === m.key);
                    const visible = mv?.visible ?? false;
                    return (
                      <TableCell key={m.key} className="py-3 text-center">
                        <button
                          onClick={() => handleToggle(role.id, m.key, visible)}
                          disabled={isPending}
                          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50"
                          style={{
                            backgroundColor: visible ? 'var(--primary)' : 'var(--muted)',
                          }}
                          aria-label={`Toggle ${m.label} for ${role.name}`}
                        >
                          <span
                            className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                            style={{
                              transform: visible ? 'translateX(24px)' : 'translateX(4px)',
                            }}
                          />
                        </button>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Badge variant="outline">
          {roles?.length ?? 0} roles
        </Badge>
        <Badge variant="outline">
          {MENU_LABELS.length} menu items
        </Badge>
      </div>
    </div>
  );
}

export default MenuVisibilitySettings;

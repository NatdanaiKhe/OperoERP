'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/app/components/atoms/card';
import { Badge } from '@/app/components/atoms/badge';
import { useProfile } from '@/app/features/auth/hooks';
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

export default function MenuConfigPage() {
  const { data: profile } = useProfile();
  const { data: roles, isLoading } = useRoles();
  const { mutateAsync: updateConfig, isPending } = useUpdateMenuConfig();
  const router = useRouter();

  const rolesList = profile?.userRoles?.map((ur) => ur.role.name) ?? [];
  const isSuperadmin = rolesList.includes('superadmin');
  const canAccess = (profile?.menuConfig ?? []).includes('user_management') || isSuperadmin;

  useEffect(() => {
    if (profile && !canAccess) {
      router.replace('/dashboard');
    }
  }, [profile, canAccess, router]);

  if (profile && !canAccess) return null;

  async function handleToggle(roleId: string, menuKey: string, currentVisible: boolean) {
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
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Menu Visibility</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure which menu items each role can see. All items are hidden by default.
        </p>
      </div>

      {isLoading ? (
        <Card className="h-96 animate-pulse bg-muted/50" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/30 bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30 bg-secondary">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Role
                </th>
                {MENU_LABELS.map((m) => (
                  <th
                    key={m.key}
                    className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {roles?.map((role: RoleWithMenu) => (
                <tr key={role.id} className="transition-colors hover:bg-secondary/50">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {role.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                      {role.description && (
                        <span className="text-xs text-muted-foreground">{role.description}</span>
                      )}
                    </div>
                  </td>
                  {MENU_LABELS.map((m) => {
                    const mv = role.menuVisibility.find((v) => v.menuKey === m.key);
                    const visible = mv?.visible ?? false;
                    return (
                      <td key={m.key} className="px-4 py-3 text-center">
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
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
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

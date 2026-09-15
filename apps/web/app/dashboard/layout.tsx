'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRequireAuth, usePermission } from '@/app/features/auth/hooks';
import { DashboardTemplate } from '@/app/components/templates/dashboard-template';
import { Button } from '@/app/components/atoms/button';
import { ROUTE_PERMISSIONS } from '@/app/lib/routes';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useRequireAuth();

  const required = ROUTE_PERMISSIONS.filter(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  ).sort((a, b) => b.prefix.length - a.prefix.length)[0]?.permission;

  // '' never matches a permission; `allow` is only consulted when `required`
  // is set. Hooks must be unconditional, so call it once at the top.
  const { allow, isLoading: profileLoading } = usePermission(required ?? '');

  useEffect(() => {
    if (status === 'unauthed') router.replace('/login');
  }, [status, router]);

  if (status !== 'authed') return null;

  // Profile still loading → render nothing; never redirect or deny early.
  if (required && profileLoading) return null;

  if (required && !allow) {
    return (
      <DashboardTemplate>
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-foreground">
            Access denied
          </h1>
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to view this page.
          </p>
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </DashboardTemplate>
    );
  }

  return <DashboardTemplate>{children}</DashboardTemplate>;
}

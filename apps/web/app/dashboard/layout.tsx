'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/app/features/auth/hooks';
import { DashboardTemplate } from '@/app/components/templates/dashboard-template';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const status = useRequireAuth();

  useEffect(() => {
    if (status === 'unauthed') router.replace('/login');
  }, [status, router]);

  if (status !== 'authed') return null;

  return <DashboardTemplate>{children}</DashboardTemplate>;
}

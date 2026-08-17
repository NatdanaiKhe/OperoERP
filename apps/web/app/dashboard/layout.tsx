'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useRefreshAuth } from '@/app/features/auth/hooks';
import { DashboardTemplate } from '@/app/components/templates/dashboard-template';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { isFetching } = useRefreshAuth();

  const triedRefresh = !isFetching && !accessToken;

  useEffect(() => {
    if (triedRefresh) {
      router.replace('/login');
    }
  }, [triedRefresh, router]);

  if (!accessToken) return null;

  return <DashboardTemplate>{children}</DashboardTemplate>;
}

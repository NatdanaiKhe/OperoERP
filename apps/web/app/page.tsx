'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useRefreshAuth } from '@/app/features/auth/hooks';

export default function RootPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { isFetching } = useRefreshAuth();

  const ready = !isFetching && !accessToken;

  useEffect(() => {
    if (accessToken) {
      router.replace('/dashboard');
    } else if (ready) {
      router.replace('/login');
    }
  }, [accessToken, ready, router]);

  return null;
}

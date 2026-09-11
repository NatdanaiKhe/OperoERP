'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/app/features/auth/hooks';

export default function RootPage() {
  const router = useRouter();

  const status = useRequireAuth();

  useEffect(() => {
    if (status === 'authed') router.replace('/dashboard');
    else if (status === 'unauthed') router.replace('/login');
  }, [status, router]);

  return null;
}

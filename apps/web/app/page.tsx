'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/features/auth/hooks';

export default function RootPage() {
  const router = useRouter();
  const { accessToken } = useAuth();

  useEffect(() => {
    router.replace(accessToken ? '/dashboard' : '/login');
  }, [accessToken, router]);

  return null;
}

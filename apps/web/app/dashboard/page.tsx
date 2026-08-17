'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/app/components/atoms/card';
import { Button } from '@/app/components/atoms/button';
import { useAuth, useLogout } from '@/app/features/auth/hooks';

// ponytail: stub dashboard, replace with real dashboard page
export default function DashboardPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { mutate: logoutMutate, isPending } = useLogout();

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login');
    }
  }, [accessToken, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Card className="max-w-md p-8 text-center">
        <h1 className="text-headline-md mb-2 text-foreground">Welcome back</h1>
        <p className="text-body-md mb-6 text-muted-foreground">
          You are signed in.
        </p>
        <Button onClick={() => logoutMutate()} loading={isPending}>
          Sign out
        </Button>
      </Card>
    </div>
  );
}

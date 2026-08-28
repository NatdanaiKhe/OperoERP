import { useCanAccess } from '@/app/features/auth/hooks';
import { useRouter } from 'next/router';
import { ReactNode, useEffect } from 'react';

function PageAccessGuard({
  menu,
  children,
}: {
  menu: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { canAccess, isLoading } = useCanAccess(menu);

  useEffect(() => {
    if (!isLoading && !canAccess) {
      router.replace('/dashboard');
    }
  }, [canAccess, isLoading, router]);

  if (isLoading || !canAccess) {
    return null;
  }

  return children;
}

export default PageAccessGuard;

import { useCanAccess } from '@/app/features/auth/hooks';
import { ReactNode } from 'react';

interface AccessGuardProps {
  menu: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function AccessGuard({
  menu,
  children,
  fallback = null,
}: AccessGuardProps) {
  const { canAccess, isLoading } = useCanAccess(menu);

  if (isLoading) {
    return null;
  }

  if (!canAccess) {
    return fallback;
  }

  return children;
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CustomerForm } from '@/app/components/organisms/customer/customer-form';
import { useCanAccess } from '@/app/features/auth/hooks';

export default function NewCustomerPage() {
  const router = useRouter();
  const { canAccess, isLoading } = useCanAccess('customers');

  useEffect(() => {
    if (!isLoading && !canAccess) {
      router.replace('/dashboard');
    }
  }, [isLoading, canAccess, router]);

  if (isLoading || !canAccess) return null;

  return <CustomerForm />;
}

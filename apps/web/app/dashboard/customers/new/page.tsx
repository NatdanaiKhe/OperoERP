'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CustomerForm } from '@/app/components/organisms/customer/customer-form';
import { usePermission } from '@/app/features/auth/hooks';

export default function NewCustomerPage() {
  const router = useRouter();
  const { allow, isLoading } = usePermission('customer:create');

  useEffect(() => {
    if (!isLoading && !allow) {
      router.replace('/dashboard');
    }
  }, [isLoading, allow, router]);

  if (isLoading || !allow) return null;

  return <CustomerForm />;
}

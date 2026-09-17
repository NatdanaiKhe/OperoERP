'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductForm } from '@/app/components/organisms/product/product-form';
import { usePermission } from '@/app/features/auth/hooks';

export default function NewProductPage() {
  const router = useRouter();
  const { allow, isLoading } = usePermission('product:create');

  useEffect(() => {
    if (!isLoading && !allow) {
      router.replace('/dashboard');
    }
  }, [isLoading, allow, router]);

  if (isLoading || !allow) return null;

  return <ProductForm />;
}

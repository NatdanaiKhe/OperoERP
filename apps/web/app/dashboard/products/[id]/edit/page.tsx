'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/app/components/atoms/button';
import { ProductForm } from '@/app/components/organisms/product/product-form';
import { FormAlert } from '@/app/components/molecules/form-alert';
import { usePermission } from '@/app/features/auth/hooks';
import { useProduct } from '@/app/features/product/hooks';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { allow, isLoading: gateLoading } = usePermission('product:update');
  const { data, isLoading, isError } = useProduct(id);

  useEffect(() => {
    if (!gateLoading && !allow) {
      router.replace('/dashboard');
    }
  }, [gateLoading, allow, router]);

  if (gateLoading || !allow) return null;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded-lg bg-muted/50" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <button
          onClick={() => router.push('/dashboard/products')}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Products
        </button>
        <h1 className="text-2xl font-semibold text-foreground">
          Edit Product
        </h1>
        <FormAlert>Product not found.</FormAlert>
        <Button onClick={() => router.push('/dashboard/products')}>
          Back to Products
        </Button>
      </div>
    );
  }

  return <ProductForm initial={data} />;
}

'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/app/components/atoms/button';
import { CustomerForm } from '@/app/components/organisms/customer/customer-form';
import { FormAlert } from '@/app/components/molecules/form-alert';
import { useCanAccess } from '@/app/features/auth/hooks';
import { useCustomer } from '@/app/features/customer/hooks';

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { canAccess, isLoading: gateLoading } = useCanAccess('customers');
  const { data, isLoading, isError } = useCustomer(id);

  useEffect(() => {
    if (!gateLoading && !canAccess) {
      router.replace('/dashboard');
    }
  }, [gateLoading, canAccess, router]);

  if (gateLoading || !canAccess) return null;

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
          onClick={() => router.push('/dashboard/customers')}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Customers
        </button>
        <h1 className="text-2xl font-semibold text-foreground">
          Edit Customer
        </h1>
        <FormAlert>Customer not found.</FormAlert>
        <Button onClick={() => router.push('/dashboard/customers')}>
          Back to Customers
        </Button>
      </div>
    );
  }

  return <CustomerForm initial={data} />;
}

'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/app/components/atoms/button';
import { Input } from '@/app/components/atoms/input';
import { Textarea } from '@/app/components/atoms/textarea';
import { Select } from '@/app/components/atoms/select';
import { Field } from '@/app/components/molecules/field';
import { FormAlert } from '@/app/components/molecules/form-alert';
import { apiErrorMessage, ApiError } from '@/app/lib/api-client';
import {
  useCreateProduct,
  useUpdateProduct,
  useProductCategories,
  useProductUoms,
} from '@/app/features/product/hooks';
import {
  NO_CATEGORY,
  TRACKING_OPTIONS,
  TYPE_OPTIONS,
  type ProductPayload,
} from '@/app/features/product/types';
import type { ProductFormProps } from './product-form.types';
import z from 'zod';
import { decimalPrefill } from '@/app/lib/format';

const optionalPrice = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.number().min(0, 'Must be 0 or greater.').optional(),
);

const optionalTaxRate = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce
    .number()
    .min(0, 'Must be 0 or greater.')
    .max(100, 'Must be 100 or less.')
    .optional(),
);

const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required.')
    .max(255, 'Name is too long.'),
  sku: z.string().trim().max(100, 'SKU is too long.').optional().default(''),
  description: z
    .string()
    .trim()
    .max(2000, 'Description is too long.')
    .optional()
    .default(''),
  type: z.enum(['STOCKABLE', 'SERVICE', 'NON_STOCK']),
  trackingMode: z.enum(['NONE', 'LOT', 'SERIAL']),
  categoryId: z.string().optional().default(NO_CATEGORY),
  baseUomId: z.string().trim().min(1, 'Unit of measure is required.'),
  defaultCost: optionalPrice,
  defaultSalesPrice: optionalPrice,
  defaultTaxRate: optionalTaxRate,
  isSellable: z.boolean(),
  isActive: z.boolean(),
});

export function ProductForm({ initial }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? '');
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [type, setType] = useState<string>(initial?.type ?? 'STOCKABLE');
  const [trackingMode, setTrackingMode] = useState<string>(
    initial?.trackingMode ?? 'NONE',
  );
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? NO_CATEGORY,
  );
  const [baseUomId, setBaseUomId] = useState(initial?.baseUomId ?? '');
  const [defaultCost, setDefaultCost] = useState(
    decimalPrefill(initial?.defaultCost),
  );
  const [defaultSalesPrice, setDefaultSalesPrice] = useState(
    decimalPrefill(initial?.defaultSalesPrice),
  );
  const [defaultTaxRate, setDefaultTaxRate] = useState(
    decimalPrefill(initial?.defaultTaxRate),
  );
  const [isSellable, setIsSellable] = useState(initial?.isSellable ?? true);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [skuError, setSkuError] = useState<string | null>(null);

  const { data: categories } = useProductCategories();
  const { data: uoms } = useProductUoms();

  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();
  const isPending = isEdit ? updateMut.isPending : createMut.isPending;

  const error = isEdit ? updateMut.error : createMut.error;

  const categoryOptions = [
    { value: NO_CATEGORY, label: 'No category' },
    ...(categories ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  const uomOptions = (uoms ?? []).map((u) => ({
    value: u.id,
    label: u.symbol ? `${u.name} (${u.symbol})` : u.name,
  }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setValidationError(null);
    setSkuError(null);

    const validation = productSchema.safeParse({
      name,
      sku,
      description,
      type,
      trackingMode,
      categoryId,
      baseUomId,
      defaultCost,
      defaultSalesPrice,
      defaultTaxRate,
      isSellable,
      isActive,
    });
    if (!validation.success) {
      setValidationError(validation.error.issues[0].message);
      return;
    }

    const payload: ProductPayload = {
      name: validation.data.name,
      baseUomId: validation.data.baseUomId,
      sku: validation.data.sku || undefined,
      description: validation.data.description || undefined,
      type: validation.data.type,
      trackingMode: validation.data.trackingMode,
      categoryId:
        validation.data.categoryId === NO_CATEGORY
          ? undefined
          : validation.data.categoryId,
      defaultCost: validation.data.defaultCost,
      defaultSalesPrice: validation.data.defaultSalesPrice,
      defaultTaxRate: validation.data.defaultTaxRate,
      isSellable: validation.data.isSellable,
      isActive: validation.data.isActive,
    };

    try {
      if (isEdit && initial) {
        await updateMut.mutateAsync({ id: initial.id, payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      router.push('/dashboard/products?saved=1');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setSkuError(err.message);
      } else {
        setValidationError(apiErrorMessage(err));
      }
    }
  }

  const displayError =
    validationError ?? (error ? apiErrorMessage(error) : null);

  const checkboxClass =
    'h-4 w-4 rounded border-input text-primary focus:ring-primary disabled:opacity-50';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <button
          onClick={() => router.push('/dashboard/products')}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Products
        </button>
        <h1 className="text-2xl font-semibold text-foreground">
          {isEdit ? 'Edit Product' : 'Add Product'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isEdit
            ? 'Update this product record.'
            : 'Create a new product record.'}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-6 rounded-lg border border-border/30 bg-card p-6"
      >
        {displayError && <FormAlert>{displayError}</FormAlert>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            htmlFor="product-name"
            label={
              <>
                Name <span className="text-destructive">*</span>
              </>
            }
          >
            <Input
              id="product-name"
              placeholder="e.g. USB-C Cable"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
          </Field>
          <Field htmlFor="product-sku" label="SKU">
            <Input
              id="product-sku"
              placeholder="e.g. SKU-001"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              disabled={isPending}
            />
            {skuError && (
              <p className="mt-1.5 text-sm text-destructive">{skuError}</p>
            )}
          </Field>
        </div>

        <Field htmlFor="product-description" label="Description">
          <Textarea
            id="product-description"
            rows={3}
            placeholder="Brief product description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isPending}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            htmlFor="product-uom"
            label={
              <>
                Unit of Measure <span className="text-destructive">*</span>
              </>
            }
          >
            <Select
              id="product-uom"
              value={baseUomId}
              onValueChange={setBaseUomId}
              options={uomOptions}
              placeholder="Select unit"
              disabled={isPending}
              className="w-full"
            />
          </Field>
          <Field htmlFor="product-category" label="Category">
            <Select
              id="product-category"
              value={categoryId}
              onValueChange={setCategoryId}
              options={categoryOptions}
              placeholder="Select category"
              disabled={isPending}
              className="w-full"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field htmlFor="product-type" label="Type">
            <Select
              id="product-type"
              value={type}
              onValueChange={setType}
              options={TYPE_OPTIONS}
              disabled={isPending}
              className="w-full"
            />
          </Field>
          <Field htmlFor="product-tracking" label="Tracking Mode">
            <Select
              id="product-tracking"
              value={trackingMode}
              onValueChange={setTrackingMode}
              options={TRACKING_OPTIONS}
              disabled={isPending}
              className="w-full"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field htmlFor="product-cost" label="Cost Price">
            <Input
              id="product-cost"
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={defaultCost}
              onChange={(e) => setDefaultCost(e.target.value)}
              disabled={isPending}
            />
          </Field>
          <Field htmlFor="product-price" label="Selling Price">
            <Input
              id="product-price"
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={defaultSalesPrice}
              onChange={(e) => setDefaultSalesPrice(e.target.value)}
              disabled={isPending}
            />
          </Field>
          <Field htmlFor="product-tax" label="Tax Rate (%)">
            <Input
              id="product-tax"
              type="number"
              min="0"
              max="100"
              step="any"
              placeholder="0.00"
              value={defaultTaxRate}
              onChange={(e) => setDefaultTaxRate(e.target.value)}
              disabled={isPending}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isSellable}
              onChange={(e) => setIsSellable(e.target.checked)}
              disabled={isPending}
              className={checkboxClass}
            />
            Sellable
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isPending}
              className={checkboxClass}
            />
            Active
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-border/30 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/products')}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Product'}
          </Button>
        </div>
      </form>
    </div>
  );
}

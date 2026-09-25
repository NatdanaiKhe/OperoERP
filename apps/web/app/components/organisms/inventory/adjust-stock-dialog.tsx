'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/app/components/atoms/button';
import { Input } from '@/app/components/atoms/input';
import { Select } from '@/app/components/atoms/select';
import { Textarea } from '@/app/components/atoms/textarea';
import { Field } from '@/app/components/molecules/field';
import { DialogShell } from '@/app/components/molecules/dialog-shell';
import { FormAlert } from '@/app/components/molecules/form-alert';
import { apiErrorMessage } from '@/app/lib/api-client';
import { useAdjustStock } from '@/app/features/inventory/hooks';
import {
  MOVEMENT_TYPE_OPTIONS,
  type ManualMovementType,
} from '@/app/features/inventory/types';
import type { AdjustStockDialogProps } from './adjust-stock-dialog.types';
import z from 'zod';

const adjustSchema = z
  .object({
    productId: z.string().min(1, 'Product is required.'),
    type: z.enum(['RECEIPT', 'ADJUSTMENT', 'WRITE_OFF']),
    quantity: z.coerce
      .number()
      .refine(
        (n) => Number.isFinite(n) && n !== 0,
        'Quantity is required and must be non-zero.',
      ),
    reason: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type !== 'RECEIPT') {
      const trimmed = data.reason?.trim() ?? '';
      if (trimmed.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reason'],
          message: 'Reason is required for this movement type.',
        });
      } else if (trimmed.length > 2000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reason'],
          message: 'Reason must be 2000 characters or fewer.',
        });
      }
    }
  });

export function AdjustStockDialog({
  open,
  onClose,
  product,
}: AdjustStockDialogProps) {
  const [type, setType] = useState<ManualMovementType>('RECEIPT');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const { mutateAsync, isPending, error, reset } = useAdjustStock();

  useEffect(() => {
    if (open) {
      setType('RECEIPT');
      setQuantity('');
      setReason('');
      setValidationError(null);
      reset();
    }
  }, [open, reset]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setValidationError(null);

    const parsed = adjustSchema.safeParse({
      productId: product.productId,
      type,
      quantity,
      reason,
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0].message);
      return;
    }

    try {
      await mutateAsync(parsed.data);
      onClose();
    } catch {
      // ApiError surfaced via mutation `error`
    }
  }

  const displayError =
    validationError ?? (error ? apiErrorMessage(error) : null);

  return (
    <DialogShell title="Adjust Stock" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {displayError && <FormAlert>{displayError}</FormAlert>}

        <div className="rounded border border-border/30 bg-secondary/50 p-3 text-sm">
          <div className="font-medium text-foreground">
            {product.productName}
          </div>
          <div className="text-muted-foreground">
            {product.sku ?? 'No SKU'} · On hand:{' '}
            <span className="font-mono tabular-nums">{product.quantity}</span>
          </div>
        </div>

        <Field htmlFor="adjust-type" label="Movement Type">
          <Select
            id="adjust-type"
            value={type}
            onValueChange={(v) => setType(v as ManualMovementType)}
            options={MOVEMENT_TYPE_OPTIONS}
            disabled={isPending}
          />
        </Field>

        <Field htmlFor="adjust-quantity" label="Quantity Delta">
          <Input
            id="adjust-quantity"
            type="number"
            step="any"
            placeholder="e.g. 10 or -5"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={isPending}
          />
        </Field>

        <Field
          htmlFor="adjust-reason"
          label={type === 'RECEIPT' ? 'Reason (optional)' : 'Reason'}
        >
          <Textarea
            id="adjust-reason"
            rows={3}
            placeholder="Why is this adjustment being made?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isPending}
          />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Adjusting...' : 'Adjust Stock'}
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}

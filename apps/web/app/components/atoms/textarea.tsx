import { Textarea as ShadcnTextarea } from '@/app/components/ui/textarea';
import type { ComponentPropsWithoutRef } from 'react';

type TextareaProps = ComponentPropsWithoutRef<typeof ShadcnTextarea>;

export function Textarea(props: TextareaProps) {
  return <ShadcnTextarea {...props} />;
}

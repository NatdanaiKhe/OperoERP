import type { ReactNode } from 'react';

export interface FieldProps {
  htmlFor: string;
  label: ReactNode;
  children: ReactNode;
}

import type { ReactNode } from 'react';

export interface TabItem {
  value: string;
  name: string;
}

export interface TabBarProps {
  items: TabItem[];
  defaultValue?: string;
  activeClassName?: string;
  children?: ReactNode;
}

export interface TabContentProps {
  children: ReactNode;
  value: string;
}

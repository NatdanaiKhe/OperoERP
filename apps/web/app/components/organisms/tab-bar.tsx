import {
  Tabs as ShadcnTabs,
  TabsList as ShadcnTabsList,
  TabsTrigger as ShadcnTabsTrigger,
  TabsContent as ShadcnTabsContent,
} from '@/app/components/ui/tabs';
import { cn } from '@/app/lib/utils';
import { ReactNode } from 'react';

export interface TabItem {
  value: string;
  name: string;
}

interface TabBarProps {
  items: TabItem[];
  defaultValue?: string;
  activeClassName?: string;
  children?: ReactNode;
}

export default function TabBar({
  items,
  defaultValue,
  activeClassName,
  children,
}: TabBarProps) {
  const defaultClassName =
    'data-[state=active]:text-primary after:bg-primary/70';

  return (
    <ShadcnTabs defaultValue={defaultValue ?? items[0]?.value}>
      <ShadcnTabsList variant="line">
        {items.map((item) => (
          <ShadcnTabsTrigger
            key={item.value}
            value={item.value}
            className={cn(defaultClassName, activeClassName)}
          >
            {item.name}
          </ShadcnTabsTrigger>
        ))}
      </ShadcnTabsList>

      {children}
    </ShadcnTabs>
  );
}

interface TabContentProps {
  children: ReactNode;
  value: string;
}

export function TabsContent({ value, children }: TabContentProps) {
  return <ShadcnTabsContent value={value}>{children}</ShadcnTabsContent>;
}

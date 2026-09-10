import {
  Tabs as ShadcnTabs,
  TabsList as ShadcnTabsList,
  TabsTrigger as ShadcnTabsTrigger,
  TabsContent as ShadcnTabsContent,
} from '@/app/components/atoms/tabs';
import { cn } from '@/app/lib/utils';
import type { TabBarProps, TabContentProps } from './tab-bar.types';

export type { TabItem } from './tab-bar.types';

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

export function TabsContent({ value, children }: TabContentProps) {
  return <ShadcnTabsContent value={value}>{children}</ShadcnTabsContent>;
}

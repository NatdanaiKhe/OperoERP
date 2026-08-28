'use client';

import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  UserCog,
  Package,
  ShoppingCart,
  SquareCheck,
  FileText,
  Plus,
  Settings,
  LifeBuoy,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { NavItem } from '@/app/components/molecules/nav-item';
import { Logo } from '@/app/components/atoms/logo';
import { useProfile } from '@/app/features/auth/hooks';
import { cn } from '@/app/lib/utils';

const ALL_NAV = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    menuKey: 'dashboard',
  },
  {
    label: 'User Management',
    href: '/dashboard/users',
    icon: UserCog,
    menuKey: 'user_management',
  },
  // { label: 'Customers', href: '/dashboard/customers', icon: Users, menuKey: 'customers' },
  // { label: 'Products', href: '/dashboard/products', icon: Package, menuKey: 'products' },
  // { label: 'Sales', href: '/dashboard/sales', icon: ShoppingCart, menuKey: 'sales' },
  // { label: 'Approvals', href: '/dashboard/approvals', icon: SquareCheck, menuKey: 'approvals' },
  // { label: 'Reports', href: '/dashboard/reports', icon: FileText, menuKey: 'reports' },
] as const;

interface SidebarProps {
  open: boolean;
  onNavClick: () => void;
}

export function Sidebar({ open, onNavClick }: SidebarProps) {
  const { data: profile } = useProfile();
  const menuConfig = profile?.menuConfig ?? [];
  const showQuickAction = menuConfig.includes('quick_action');

  const visibleNav = ALL_NAV.filter((item) =>
    menuConfig.includes(item.menuKey),
  );

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col border-r border-border bg-card transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full',
        'md:translate-x-0',
      )}
    >
      <div className="flex h-14 items-center border-b border-border/30 px-5">
        <Logo size="sm" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNav.map(({ label, href, icon: Icon }) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            icon={<Icon className="h-5 w-5" />}
            onNavigate={onNavClick}
          />
        ))}
      </nav>

      {showQuickAction && (
        <div className="px-3 pb-4">
          <Button asChild className="w-full">
            <Link href="/dashboard/quick-action">
              <Plus className="h-4 w-4" />
              Quick Action
            </Link>
          </Button>
        </div>
      )}

      {/* Settings + Support always visible */}
      <div className="space-y-1 border-t border-border/30 px-3 py-4">
        <NavItem
          href="/dashboard/settings"
          label="Settings"
          icon={<Settings className="h-5 w-5" />}
          onNavigate={onNavClick}
        />
        <NavItem
          href="/dashboard/support"
          label="Support"
          icon={<LifeBuoy className="h-5 w-5" />}
          onNavigate={onNavClick}
        />
      </div>
    </aside>
  );
}

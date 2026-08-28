'use client';

import Link from 'next/link';
import {
  Menu,
  Search,
  RotateCcw,
  Bell,
  CircleQuestionMark,
  LogOut,
} from 'lucide-react';
import { Input } from '@/app/components/atoms/input';
import { Avatar } from '@/app/components/atoms/avatar';
import { useProfile, useLogout } from '@/app/features/auth/hooks';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: profile } = useProfile();
  const { mutate: logoutMutate, isPending } = useLogout();

  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
      profile.username
    : '';

  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-height)] items-center gap-3 border-b border-border bg-background px-4 md:px-6">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search */}
      {/* ponytail: search is non-functional, wire to search endpoint when it exists */}
      {/* <div className="relative hidden w-64 md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search..." className="h-9 pl-9" />
      </div> */}

      <div className="flex-1" />

      {/* Action icons */}
      {/* ponytail: icons are non-functional, wire when features land */}
      <div className="flex items-center gap-1">
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="History"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
        <Link
          href="/dashboard/help"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Help"
        >
          <CircleQuestionMark className="h-5 w-5" />
        </Link>
      </div>

      {/* User area */}
      <div className="flex items-center gap-2 pl-2">
        <Avatar name={displayName} size="sm" />
        <span className="hidden text-sm text-foreground sm:block">
          {displayName}
        </span>
        <button
          onClick={() => logoutMutate()}
          disabled={isPending}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

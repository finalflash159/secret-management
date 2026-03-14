'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  ChevronRight,
  Search,
  Bell,
  LogOut,
  User,
  Settings,
  Command,
} from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  name?: string | null;
}

interface HeaderProps {
  user: UserData | null;
  sidebarCollapsed?: boolean;
}

export function Header({ user, sidebarCollapsed = false }: HeaderProps) {
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Build breadcrumbs from pathname
  const pathSegments = pathname.split('/').filter(Boolean);

  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-20 h-11 border-b border-[var(--color-border)] bg-[var(--color-card)]/80 backdrop-blur-sm transition-all duration-300',
        sidebarCollapsed ? 'left-14' : 'left-56'
      )}
    >
      <div className="flex h-full items-center justify-between px-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5">
          <Link
            href="/organizations"
            className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            Organizations
          </Link>
          {pathSegments.slice(1).map((segment, index) => {
            const href = '/' + pathSegments.slice(0, index + 2).join('/');
            const isLast = index === pathSegments.length - 2;
            const label = segment.replace(/-/g, ' ');

            return (
              <span key={href} className="flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                {isLast ? (
                  <span className="text-sm font-medium capitalize text-[var(--color-foreground)]">
                    {label}
                  </span>
                ) : (
                  <Link
                    href={href}
                    className="text-sm capitalize text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                  >
                    {label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <button className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-1.5 text-xs text-[var(--color-muted-foreground)] hover:border-[var(--color-border-hover)] transition-colors">
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:flex items-center gap-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted-foreground)]">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <button className="relative rounded-md p-2 text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] transition-colors">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--color-danger)]" />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-md p-1 hover:bg-[var(--color-accent)] transition-colors"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface)]">
                <User className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              </div>
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] py-1.5 shadow-xl animate-fadeIn">
                  <div className="border-b border-[var(--color-border)] px-3 pb-2.5 mb-1.5">
                    <p className="text-sm font-medium text-[var(--color-foreground)]">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{user?.email}</p>
                  </div>
                  <button className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-accent)]">
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  <button className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-accent)]">
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <div className="border-t border-[var(--color-border)] mt-1.5 pt-1.5">
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

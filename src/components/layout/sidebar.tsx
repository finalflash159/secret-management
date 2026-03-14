'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';

interface UserData {
  id: string;
  email: string;
  name?: string | null;
}

interface SidebarProps {
  user: UserData | null;
  collapsed?: boolean;
  onToggle?: () => void;
}

function Icon({ src, alt, className, width = 18, height = 18 }: { src: string; alt: string; className?: string; width?: number; height?: number }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}

export function Sidebar({ user, collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Organizations',
      href: '/organizations',
      icon: '/icons/building.svg',
    },
  ];

  const isActive = (href: string) => {
    if (href === '/organizations') {
      return pathname === '/organizations';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-[var(--color-border)] bg-[var(--color-card)] transition-all duration-300',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="flex h-11 items-center border-b border-[var(--color-border)] px-3">
        <Link href="/organizations" className="flex items-center gap-2.5">
          <Image
            src="/logo.svg"
            alt="Logo"
            width={24}
            height={24}
            className="rounded-md"
          />
          {!collapsed && (
            <span className="font-semibold text-[var(--color-foreground)] text-sm">Secret Manager</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {!collapsed && (
          <div className="mb-4">
            <div className="relative">
              <Icon src="/icons/search.svg" alt="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" width={14} height={14} />
              <input
                type="text"
                placeholder="Search..."
                className="h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] pl-8 pr-3 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-0.5 text-[9px] text-[var(--color-muted-foreground)]">
                <span>⌘K</span>
              </kbd>
            </div>
          </div>
        )}

        <div className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-all',
                  active
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]',
                  collapsed && 'justify-center px-1.5'
                )}
              >
                <Icon
                  src={item.icon}
                  alt={item.label}
                  className={cn('h-4 w-4 shrink-0', active && 'text-[var(--color-primary)]')}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Menu */}
      <div className="border-t border-[var(--color-border)] p-3">
        {user && (
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-surface)]">
              <Icon src="/icons/user.svg" alt="User" className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" width={14} height={14} />
            </div>
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
                  {user.name || user.email}
                </p>
                <p className="truncate text-xs text-[var(--color-muted-foreground)]">{user.email}</p>
              </div>
            )}
          </div>
        )}

        <div className={cn('mt-3 space-y-0.5', collapsed && 'flex flex-col items-center')}>
          <button
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]',
              collapsed && 'justify-center px-2'
            )}
          >
            <ThemeToggle />
            {!collapsed && <span>Theme</span>}
          </button>

          <button
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]',
              collapsed && 'justify-center px-2'
            )}
          >
            <Icon src="/icons/settings.svg" alt="Settings" className="h-4 w-4" />
            {!collapsed && <span>Settings</span>}
          </button>
          <button
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]',
              collapsed && 'justify-center px-2'
            )}
          >
            <Icon src="/icons/log-out.svg" alt="Sign out" className="h-4 w-4" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        {onToggle && (
          <button
            onClick={onToggle}
            className={cn(
              'mt-3 flex w-full items-center justify-center rounded-md border border-[var(--color-border)] py-2 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]',
              collapsed && 'border-0'
            )}
          >
            {collapsed ? (
              <Icon src="/icons/chevron-right.svg" alt="Expand" className="h-4 w-4" width={16} height={16} />
            ) : (
              <>
                <Icon src="/icons/chevron-left.svg" alt="Collapse" className="h-3.5 w-3.5 mr-1.5" width={14} height={14} />
                <span>Collapse</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}

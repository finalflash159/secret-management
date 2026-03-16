'use client';

import { memo, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { Logo } from '@/components/logo';
import { Settings, Users, LogOut, Key, RefreshCw, FolderOpen, Plug, Shield, FileText, Bell, CreditCard } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  name?: string | null;
}

interface SidebarProps {
  user: UserData | null;
  collapsed?: boolean;
  organizationSlug?: string | null;
  unreadAlerts?: number;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  badge?: string | number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function SidebarComponent({ user, collapsed = false, organizationSlug, unreadAlerts = 0 }: SidebarProps) {
  const pathname = usePathname();

  // Build base href based on org slug
  const baseHref = organizationSlug ? `/organizations/${organizationSlug}` : '/organizations';

  // Memoize nav groups with dynamic hrefs
  const navGroups = useMemo<NavGroup[]>(() => [
    {
      label: 'Project',
      items: [
        { label: 'Secrets', href: baseHref, icon: <Key className="h-4 w-4" /> },
        { label: 'Dynamic Secrets', href: `${baseHref}/dynamic-secrets`, icon: <RefreshCw className="h-4 w-4" /> },
        { label: 'Secret Rotation', href: `${baseHref}/secret-rotation`, icon: <RefreshCw className="h-4 w-4" />, badge: 'New' },
        { label: 'Folders', href: `${baseHref}/folders`, icon: <FolderOpen className="h-4 w-4" /> },
        { label: 'Integrations', href: `${baseHref}/integrations`, icon: <Plug className="h-4 w-4" /> },
      ],
    },
    {
      label: 'Security',
      items: [
        { label: 'Access Control', href: `${baseHref}/access-control`, icon: <Shield className="h-4 w-4" /> },
        { label: 'Audit Logs', href: `${baseHref}/audit-logs`, icon: <FileText className="h-4 w-4" /> },
        { label: 'Alerts', href: `${baseHref}/alerts`, icon: <Bell className="h-4 w-4" />, badge: unreadAlerts > 0 ? unreadAlerts : undefined },
      ],
    },
    {
      label: 'Settings',
      items: [
        { label: 'Project Settings', href: `${baseHref}/settings`, icon: <Settings className="h-4 w-4" /> },
        { label: 'Members', href: `${baseHref}/members`, icon: <Users className="h-4 w-4" /> },
        { label: 'Billing', href: `${baseHref}/billing`, icon: <CreditCard className="h-4 w-4" /> },
      ],
    },
  ], [baseHref, unreadAlerts]);

  const isActive = useCallback((href: string) => {
    // Exact match only - prevent multiple active items
    return pathname === href;
  }, [pathname]);

  const getInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-card transition-colors duration-200 h-full',
        collapsed ? 'w-14' : 'w-[220px]'
      )}
    >
      {/* Top Section - Logo & Project Selector */}
      <div className="border-b border-border">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3 px-4 py-4">
          <Logo width={32} height={32} />
          <span className="text-lg font-extrabold tracking-tight text-foreground">Gondor</span>
        </div>

      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <div className="px-2 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.href && isActive(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href || '#'}
                    prefetch={true}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-all relative',
                      active
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      collapsed && 'justify-center px-1.5'
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-primary rounded-full" />
                    )}
                    <span className={cn('h-4 w-4 shrink-0', active && 'text-foreground')}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <>
                        <span>{item.label}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              'ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                              typeof item.badge === 'number'
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-gold/20 text-gold'
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section - User & Settings */}
      <div className="border-t border-border p-2">
        {/* Theme Toggle */}
        <div className={cn('mb-2', collapsed && 'flex justify-center')}>
          <ThemeToggle />
        </div>

        {/* User Profile */}
        {user && (
          <div className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors', collapsed && 'justify-center')}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold/80 to-gold text-[11px] font-bold text-foreground">
              {getInitials(user.name || user.email)}
            </div>
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.name || 'User'}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">Admin</p>
              </div>
            )}
          </div>
        )}

        {/* Settings & Sign out */}
        <div className={cn('mt-2 space-y-0.5', collapsed && 'flex flex-col items-center')}>
          {organizationSlug && (
            <Link
              href={`/organizations/${organizationSlug}/settings`}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
                collapsed && 'justify-center px-1.5'
              )}
            >
              <Settings className="h-4 w-4" />
              {!collapsed && <span>Settings</span>}
            </Link>
          )}
          <button
            onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center px-1.5'
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}

// Export memoized version
const Sidebar = memo(SidebarComponent);
export { Sidebar };

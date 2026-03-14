'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { ChevronDown, Settings, Users, LogOut, Key, RefreshCw, FolderOpen, Plug, Shield, FileText, Bell, CreditCard } from 'lucide-react';

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

export function Sidebar({ user, collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const navGroups: NavGroup[] = [
    {
      label: 'Project',
      items: [
        { label: 'Secrets', href: '/organizations', icon: <Key className="h-4 w-4" /> },
        { label: 'Dynamic Secrets', href: '#', icon: <RefreshCw className="h-4 w-4" /> },
        { label: 'Secret Rotation', href: '#', icon: <RefreshCw className="h-4 w-4" />, badge: 'New' },
        { label: 'Folders', href: '#', icon: <FolderOpen className="h-4 w-4" /> },
        { label: 'Integrations', href: '#', icon: <Plug className="h-4 w-4" /> },
      ],
    },
    {
      label: 'Security',
      items: [
        { label: 'Access Control', href: '#', icon: <Shield className="h-4 w-4" /> },
        { label: 'Audit Logs', href: '#', icon: <FileText className="h-4 w-4" /> },
        { label: 'Alerts', href: '#', icon: <Bell className="h-4 w-4" />, badge: '2' },
      ],
    },
    {
      label: 'Settings',
      items: [
        { label: 'Project Settings', href: '#', icon: <Settings className="h-4 w-4" /> },
        { label: 'Members', href: '#', icon: <Users className="h-4 w-4" /> },
        { label: 'Billing', href: '#', icon: <CreditCard className="h-4 w-4" /> },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === '/organizations') {
      return pathname === '/organizations';
    }
    return pathname.startsWith(href);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-border bg-card',
        collapsed ? 'w-14' : 'w-[220px]'
      )}
    >
      {/* Top Section - Logo & Project Selector */}
      <div className="border-b border-border">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3 px-4 py-4">
          <Image
            src="/gondor-logo.png"
            alt="Logo"
            width={28}
            height={28}
            className="rounded-lg dark:brightness-0 dark:invert"
          />
          <span className="text-lg font-extrabold tracking-tight text-foreground">Gondor</span>
          <span className="ml-auto rounded px-2.5 py-1 text-[10px] font-bold bg-gold/20 text-gold">
            FREE
          </span>
        </div>

        {/* Project Selector */}
        {!collapsed && (
          <div className="px-2 pb-3">
            <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted transition-colors">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
                MT
              </div>
              <span className="flex-1 truncate text-sm font-medium text-foreground">
                minas-tirith
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        )}
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
          <button className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
            collapsed && 'justify-center px-1.5'
          )}>
            <Settings className="h-4 w-4" />
            {!collapsed && <span>Settings</span>}
          </button>
          <button className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
            collapsed && 'justify-center px-1.5'
          )}>
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}

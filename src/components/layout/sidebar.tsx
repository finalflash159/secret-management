'use client';

import { memo, useMemo, useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { Logo } from '@/components/logo';
import { Settings, Users, LogOut, Key, RefreshCw, FolderOpen, Plug, Shield, FileText, Bell, CreditCard, Building2, ChevronDown, Plus, Loader2, Mail } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  name?: string | null;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  avatar?: string | null;
}

interface SidebarProps {
  user: UserData | null;
  collapsed?: boolean;
  organizationSlug?: string | null;
  orgRole?: 'owner' | 'admin' | 'member' | null;
  currentProjectId?: string | null;
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

function SidebarComponent({ user, collapsed = false, organizationSlug, orgRole, currentProjectId, unreadAlerts = 0 }: SidebarProps) {
  const pathname = usePathname();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  // Fetch organizations on mount
  useEffect(() => {
    async function fetchOrgs() {
      setLoadingOrgs(true);
      try {
        const res = await fetch('/api/organizations');
        if (res.ok) {
          const json = await res.json();
          const data = json?.data ?? json;
          setOrganizations(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to fetch organizations:', err);
      } finally {
        setLoadingOrgs(false);
      }
    }
    if (!organizationSlug) {
      fetchOrgs();
    }
  }, [organizationSlug]);

  // Find current org
  const currentOrg = useMemo(() => {
    return organizations.find(org => org.slug === organizationSlug);
  }, [organizations, organizationSlug]);

  // Build base href based on org slug
  const baseHref = organizationSlug ? `/organizations/${organizationSlug}` : '/organizations';

  const isAdmin = orgRole === 'owner' || orgRole === 'admin';

  // Only show navigation when org is selected
  const navGroups = useMemo<NavGroup[]>(() => {
    if (!organizationSlug) return [];

    return [
      {
        label: 'Project',
        items: [
          { label: 'Secrets', href: baseHref, icon: <Key className="h-4 w-4" /> },
          { label: 'Dynamic Secrets', href: `${baseHref}/dynamic-secrets`, icon: <RefreshCw className="h-4 w-4" /> },
          { label: 'Secret Rotation', href: `${baseHref}/secret-rotation`, icon: <RefreshCw className="h-4 w-4" />, badge: 'New' },
          { label: 'Folders', href: `${baseHref}/folders`, icon: <FolderOpen className="h-4 w-4" /> },
          { label: 'Integrations', href: `${baseHref}/integrations`, icon: <Plug className="h-4 w-4" /> },
          ...(currentProjectId && isAdmin ? [{ label: 'Members', href: `${baseHref}/projects/${currentProjectId}/members`, icon: <Users className="h-4 w-4" /> }] : []),
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
          { label: 'Settings', href: `${baseHref}/settings`, icon: <Settings className="h-4 w-4" /> },
          { label: 'Members', href: `${baseHref}/members`, icon: <Users className="h-4 w-4" /> },
          { label: 'Invitations', href: `${baseHref}/invitations`, icon: <Mail className="h-4 w-4" /> },
          { label: 'Billing', href: `${baseHref}/billing`, icon: <CreditCard className="h-4 w-4" /> },
        ],
      },
    ].map(group => ({
      ...group,
      // Hide Settings group for non-admin/member (shouldn't happen but safety check)
      items: group.items.filter(item => {
        // Non-members never see Settings group items
        if (!orgRole) return false;
        // All roles see Secrets, Folders, Alerts
        if (['Secrets', 'Dynamic Secrets', 'Secret Rotation', 'Folders', 'Integrations', 'Audit Logs', 'Alerts'].includes(item.label)) return true;
        // Only admin/owner see Settings, Members, Invitations, Billing, Access Control
        if (['Settings', 'Members', 'Invitations', 'Billing', 'Access Control'].includes(item.label)) return isAdmin;
        return true;
      }),
    })).filter(group => group.items.length > 0);
  }, [baseHref, unreadAlerts, organizationSlug, orgRole, isAdmin, currentProjectId]);

  const isActive = useCallback((href: string) => {
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

  const getOrgInitials = useCallback((name: string) => {
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
      {/* Top Section - Logo & Org Selector */}
      <div className="border-b border-border">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3 px-4 py-5">
          <Logo width={48} height={48} />
          <span className="text-3xl font-extrabold tracking-tight text-foreground">Gondor</span>
        </div>

        {/* Organization Selector */}
        {!collapsed && (
          <div className="px-2 pb-3">
            <div className="relative">
              <button
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-2 rounded-md border border-border bg-background/50',
                  'hover:bg-muted transition-colors text-left'
                )}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                  {currentOrg ? getOrgInitials(currentOrg.name) : <Building2 className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {currentOrg ? currentOrg.name : 'Select Org'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {currentOrg ? currentOrg.slug : 'Choose an organization'}
                  </p>
                </div>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform', showOrgDropdown && 'rotate-180')} />
              </button>

              {/* Org Dropdown */}
              {showOrgDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowOrgDropdown(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border border-border bg-card shadow-lg overflow-hidden">
                    <div className="max-h-[200px] overflow-y-auto">
                      {loadingOrgs ? (
                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                          Loading...
                        </div>
                      ) : organizations.length === 0 ? (
                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                          No organizations
                        </div>
                      ) : (
                        organizations.map((org) => (
                          <Link
                            key={org.id}
                            href={`/organizations/${org.slug}`}
                            onClick={() => setShowOrgDropdown(false)}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors',
                              org.slug === organizationSlug && 'bg-muted'
                            )}
                          >
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                              {getOrgInitials(org.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{org.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">/{org.slug}</p>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                    <div className="border-t border-border">
                      <Link
                        href="/organizations?create=true"
                        onClick={() => setShowOrgDropdown(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Create New Org
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {!organizationSlug ? (
          <div className="space-y-2">
            <p className="px-2 text-xs text-muted-foreground font-medium">Your Organizations</p>
            {loadingOrgs ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
              </div>
            ) : organizations.length === 0 ? (
              <div className="px-2 py-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">No organizations yet</p>
                <Link
                  href="/organizations?create=true"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  Create your first organization
                </Link>
              </div>
            ) : (
              <div className="space-y-0.5">
                {organizations.map((org) => (
                  <Link
                    key={org.id}
                    href={`/organizations/${org.slug}`}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-all',
                      'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-[9px] font-bold text-primary">
                      {getOrgInitials(org.name)}
                    </div>
                    <span className="truncate">{org.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          navGroups.map((group) => (
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
          ))
        )}
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
                  {user.name || user.email.split('@')[0]}
                </p>
                <p className="truncate text-[10px] text-muted-foreground capitalize">
                  {orgRole || 'Member'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Settings & Sign out */}
        <div className={cn('mt-2 space-y-0.5', collapsed && 'flex flex-col items-center')}>
          {organizationSlug && isAdmin && (
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

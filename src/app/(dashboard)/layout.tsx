'use client';

import { ReactNode, useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '@/components/session-provider';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useSession();
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  // Extract org slug from pathname - use useMemo to ensure consistency
  const currentOrgSlug = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);

    // Known pages under /organizations that DON'T have org slug
    const knownStandalonePages = [
      'dynamic-secrets',
      'secret-rotation',
      'integrations',
      'folders',
      'access-control',
      'audit-logs',
      'alerts',
      'billing',
      'members',
      'settings',
    ];

    // Check if this is a valid org page
    // /organizations/codelux → orgSlug = codelux
    // /organizations/codelux/folders → orgSlug = codelux
    // /organizations/folders → orgSlug = null (should redirect)
    if (segments[0] === 'organizations' && segments[1]) {
      const isStandalonePage = knownStandalonePages.includes(segments[1]);
      const hasPage = segments[2];

      if (isStandalonePage && !hasPage) {
        return null;
      }
      return segments[1];
    }
    return null;
  }, [pathname]);

  // Fetch unread alert count only once on initial load
  useEffect(() => {
    async function fetchAlertCount() {
      if (!user?.id) return;
      try {
        const res = await fetch('/api/alerts/unread-count');
        const json = await res.json();
        if (json?.data?.count !== undefined) {
          setUnreadAlerts(json.data.count);
        }
      } catch (err) {
        console.error('Failed to fetch alert count:', err);
      }
    }
    fetchAlertCount();
  }, [user?.id]);

  // Redirect to login if not authenticated - use useEffect to avoid render-time redirect
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  // Show loading only on initial load
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden">
      <div className="flex h-full">
        <div className="flex flex-col border-r border-border">
          <Sidebar
            user={user}
            collapsed={false}
            organizationSlug={currentOrgSlug}
            unreadAlerts={unreadAlerts}
          />
        </div>
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header
            user={user}
            sidebarCollapsed={false}
            organizationSlug={currentOrgSlug}
            unreadAlerts={unreadAlerts}
          />
          <main className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

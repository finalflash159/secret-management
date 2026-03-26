'use client';

import { ReactNode, useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '@/components/session-provider';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { HeaderActionsProvider } from '@/components/layout/header-actions';

type OrgRole = 'owner' | 'admin' | 'member';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useSession();
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [orgRole, setOrgRole] = useState<OrgRole | null>(null);

  // Extract org slug and current project id from pathname
  const { currentOrgSlug, currentProjectId } = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    const knownStandalonePages = [
      'dynamic-secrets', 'secret-rotation', 'integrations',
      'folders', 'access-control', 'audit-logs',
      'alerts', 'billing', 'members', 'settings',
    ];
    let orgSlug: string | null = null;
    let projectId: string | null = null;
    if (segments[0] === 'organizations' && segments[1]) {
      const isStandalonePage = knownStandalonePages.includes(segments[1]);
      const hasPage = segments[2];
      if (isStandalonePage && !hasPage) orgSlug = null;
      else orgSlug = segments[1];
      // Check if we're in a project page: /organizations/[slug]/projects/[projectId]/...
      if (segments[2] === 'projects' && segments[3]) {
        projectId = segments[3];
      }
    }
    return { currentOrgSlug: orgSlug, currentProjectId: projectId };
  }, [pathname]);

  // Fetch org role when slug is set
  useEffect(() => {
    async function fetchOrgRole() {
      if (!currentOrgSlug || !user?.id) {
        setOrgRole(null);
        return;
      }
      try {
        const res = await fetch(`/api/organizations/${currentOrgSlug}`);
        if (res.ok) {
          const json = await res.json();
          const data = json?.data ?? json;
          const myMembership = data?.members?.find(
            (m: { userId: string }) => m.userId === user.id
          );
          setOrgRole(myMembership?.role ?? null);
        } else {
          setOrgRole(null);
        }
      } catch {
        setOrgRole(null);
      }
    }
    fetchOrgRole();
  }, [currentOrgSlug, user?.id]);

  // Fetch unread alert count
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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

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
            orgRole={orgRole}
            currentProjectId={currentProjectId}
            unreadAlerts={unreadAlerts}
          />
        </div>
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <HeaderActionsProvider>
            <Header
              user={user}
              sidebarCollapsed={false}
              organizationSlug={currentOrgSlug}
              orgRole={orgRole}
              unreadAlerts={unreadAlerts}
            />
            <main className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto p-6">{children}</div>
            </main>
          </HeaderActionsProvider>
        </div>
      </div>
    </div>
  );
}

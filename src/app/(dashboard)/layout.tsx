'use client';

import { ReactNode, useEffect, useState, useRef } from 'react';
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
  const [isNavigating, setIsNavigating] = useState(false);
  const prevPathRef = useRef(pathname);

  // Extract org slug from pathname
  const segments = pathname.split('/').filter(Boolean);
  const currentOrgSlug = segments[1] || null;

  // Detect navigation to show skeleton
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      setIsNavigating(true);
      const timer = setTimeout(() => {
        setIsNavigating(false);
        prevPathRef.current = pathname;
      }, 50);
      return () => clearTimeout(timer);
    }
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
    <div className="min-h-screen bg-background">
      <Sidebar
        user={user}
        collapsed={false}
        organizationSlug={currentOrgSlug}
        unreadAlerts={unreadAlerts}
      />
      <Header
        user={user}
        sidebarCollapsed={false}
        organizationSlug={currentOrgSlug}
        unreadAlerts={unreadAlerts}
      />
      <main className="pt-[52px] pl-[220px]">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

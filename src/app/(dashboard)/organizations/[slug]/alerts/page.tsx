'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  Trash2,
  Loader2,
  Eye,
  Shield,
  Key,
  UserPlus,
  UserMinus,
  Lock,
  LockOpen,
  Calendar,
  Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

// Alert types matching the backend enum
type AlertType =
  | 'info'
  | 'warning'
  | 'error'
  | 'success'
  | 'secret_expiry'
  | 'secret_expired'
  | 'security'
  | 'member_added'
  | 'member_removed'
  | 'access_granted'
  | 'access_revoked';

interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
  orgId?: string | null;
  org?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  projectId?: string | null;
  project?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  metadata?: Record<string, unknown> | null;
}

interface AlertFilters {
  type: AlertType | 'all';
  scope: 'all' | 'organization' | 'project';
  read: 'all' | 'read' | 'unread';
}

// Alert type configuration
const alertTypeConfig: Record<
  AlertType,
  { icon: React.ElementType; bgClass: string; iconClass: string; label: string }
> = {
  info: { icon: Info, bgClass: 'bg-blue-500/10', iconClass: 'text-blue-500', label: 'Info' },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-yellow-500/10',
    iconClass: 'text-yellow-500',
    label: 'Warning',
  },
  error: { icon: Bell, bgClass: 'bg-red-500/10', iconClass: 'text-red-500', label: 'Error' },
  success: {
    icon: CheckCircle,
    bgClass: 'bg-green-500/10',
    iconClass: 'text-green-500',
    label: 'Success',
  },
  secret_expiry: {
    icon: Calendar,
    bgClass: 'bg-orange-500/10',
    iconClass: 'text-orange-500',
    label: 'Secret Expiring',
  },
  secret_expired: {
    icon: Key,
    bgClass: 'bg-red-500/10',
    iconClass: 'text-red-500',
    label: 'Secret Expired',
  },
  security: {
    icon: Shield,
    bgClass: 'bg-purple-500/10',
    iconClass: 'text-purple-500',
    label: 'Security',
  },
  member_added: {
    icon: UserPlus,
    bgClass: 'bg-green-500/10',
    iconClass: 'text-green-500',
    label: 'Member Added',
  },
  member_removed: {
    icon: UserMinus,
    bgClass: 'bg-red-500/10',
    iconClass: 'text-red-500',
    label: 'Member Removed',
  },
  access_granted: {
    icon: LockOpen,
    bgClass: 'bg-green-500/10',
    iconClass: 'text-green-500',
    label: 'Access Granted',
  },
  access_revoked: {
    icon: Lock,
    bgClass: 'bg-red-500/10',
    iconClass: 'text-red-500',
    label: 'Access Revoked',
  },
};

// Filter options
const typeOptions: { value: AlertType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'success', label: 'Success' },
  { value: 'secret_expiry', label: 'Secret Expiring' },
  { value: 'secret_expired', label: 'Secret Expired' },
  { value: 'security', label: 'Security' },
  { value: 'member_added', label: 'Member Added' },
  { value: 'member_removed', label: 'Member Removed' },
  { value: 'access_granted', label: 'Access Granted' },
  { value: 'access_revoked', label: 'Access Revoked' },
];

const scopeOptions = [
  { value: 'all', label: 'All Scopes' },
  { value: 'organization', label: 'Organization' },
  { value: 'project', label: 'Project' },
];

const readOptions = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
];

export default function AlertsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { addToast } = useToast();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [userOrgRole, setUserOrgRole] = useState<string | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AlertFilters>({
    type: 'all',
    scope: 'all',
    read: 'all',
  });
  const [page, setPage] = useState(0);
  const limit = 20;

  const fetchOrganizationContext = useCallback(async () => {
    try {
      setContextError(null);
      const [res, sessionRes] = await Promise.all([
        fetch(`/api/organizations/${slug}`),
        fetch('/api/auth/session'),
      ]);

      if (!res.ok) {
        setAlerts([]);
        setTotal(0);
        setOrganizationId(null);
        setUserOrgRole(null);
        setContextError('Failed to load organization context');
        setLoading(false);
        addToast({
          title: 'Error',
          description: 'Failed to load organization context',
          variant: 'error',
        });
        return;
      }

      const json = await res.json();
      const data = json?.data ?? json;
      const nextOrganizationId = data?.id ?? null;

      if (!nextOrganizationId) {
        setAlerts([]);
        setTotal(0);
        setOrganizationId(null);
        setUserOrgRole(null);
        setContextError('Failed to load organization context');
        setLoading(false);
        addToast({
          title: 'Error',
          description: 'Failed to load organization context',
          variant: 'error',
        });
        return;
      }

      setOrganizationId(nextOrganizationId);

      if (sessionRes.ok) {
        const sessionJson = await sessionRes.json();
        const myMembership = data?.members?.find(
          (m: { userId: string }) => m.userId === sessionJson?.user?.id
        );
        setUserOrgRole(myMembership?.role ?? null);
      }
    } catch (err) {
      console.error('Failed to fetch organization context:', err);
      setAlerts([]);
      setTotal(0);
      setOrganizationId(null);
      setUserOrgRole(null);
      setContextError('Failed to load organization context');
      setLoading(false);
      addToast({
        title: 'Error',
        description: 'Failed to load organization context',
        variant: 'error',
      });
    }
  }, [slug, addToast]);

  useEffect(() => {
    fetchOrganizationContext();
  }, [fetchOrganizationContext]);

  // Fetch alerts from API
  const fetchAlerts = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('orgId', organizationId);
      params.set('limit', String(limit));
      params.set('offset', String(page * limit));
      if (filters.scope !== 'all') params.set('scope', filters.scope);
      if (filters.type !== 'all') params.set('type', filters.type);
      if (filters.read === 'read') params.set('read', 'true');
      else if (filters.read === 'unread') params.set('read', 'false');

      const res = await fetch(`/api/alerts?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to load alerts');
      }
      const json = await res.json();

      if (json?.data) {
        setAlerts(json.data.alerts || []);
        setTotal(json.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      addToast({
        title: 'Error',
        description: 'Failed to load alerts',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [filters, page, organizationId, addToast]);

  useEffect(() => {
    if (organizationId) {
      fetchAlerts();
    }
  }, [organizationId, fetchAlerts]);

  // Mark alert as read
  const handleMarkAsRead = async (alertId: string) => {
    try {
      const res = await fetch('/api/alerts/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });

      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, read: true, readAt: new Date().toISOString() } : a))
        );
        addToast({
          title: 'Alert marked as read',
          variant: 'success',
        });
      }
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!organizationId) return;

    try {
      const res = await fetch(`/api/alerts/mark-read?orgId=${organizationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });

      if (res.ok) {
        setAlerts((prev) => prev.map((a) => ({ ...a, read: true, readAt: new Date().toISOString() })));
        addToast({
          title: 'All alerts marked as read',
          variant: 'success',
        });
        // Refresh to update count
        fetchAlerts();
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // Delete alert
  const handleDelete = async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts?id=${alertId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        setTotal((prev) => prev - 1);
        addToast({
          title: 'Alert deleted',
          variant: 'success',
        });
      }
    } catch (err) {
      console.error('Failed to delete alert:', err);
    }
  };

  const getConfig = (type: AlertType) => alertTypeConfig[type] || alertTypeConfig.info;
  const unreadCount = alerts.filter((a) => !a.read).length;
  const displayedTotal = total;
  const totalPages = Math.ceil(total / limit);
  const isAdmin = userOrgRole === 'owner' || userOrgRole === 'admin';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Stay updated on secrets, security, and team activities
          </p>
        </div>
        {unreadCount > 0 && isAdmin && (
          <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
            <Eye className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Filters:</span>
            </div>

            {/* Type Filter */}
            <select
              value={filters.type}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, type: e.target.value as AlertType | 'all' }));
                setPage(0);
              }}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Read Filter */}
            <select
              value={filters.read}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, read: e.target.value as 'all' | 'read' | 'unread' }));
                setPage(0);
              }}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {readOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Scope Filter */}
            <select
              value={filters.scope}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, scope: e.target.value as 'all' | 'organization' | 'project' }));
                setPage(0);
              }}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {scopeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Results count */}
            <span className="ml-auto text-sm text-muted-foreground">
              {displayedTotal} alert{displayedTotal !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Alert List */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : contextError ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-foreground">Unable to load organization alerts</p>
              <p className="text-xs text-muted-foreground mt-1">{contextError}</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">No alerts</p>
              <p className="text-xs text-muted-foreground mt-1">
                Alerts about secret expiries, member changes, and security will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {alerts.map((alert) => {
                const config = getConfig(alert.type);
                const Icon = config.icon;

                return (
                  <div
                    key={alert.id}
                    className={cn(
                      'flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors',
                      !alert.read && 'bg-muted/30'
                    )}
                  >
                    {/* Icon */}
                    <div className={cn('p-2 rounded-lg shrink-0', config.bgClass)}>
                      <Icon className={cn('h-5 w-5', config.iconClass)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{alert.title}</span>
                        {!alert.read && <span className="w-2 h-2 rounded-full bg-danger" />}
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            config.bgClass,
                            config.iconClass
                          )}
                        >
                          {config.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{new Date(alert.createdAt).toLocaleString()}</span>
                        {alert.org && <span className="text-info">{alert.org.name}</span>}
                        {alert.project && <span className="text-warning">{alert.project.name}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!alert.read && isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(alert.id)}
                          title="Mark as read"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(alert.id)}
                          title="Delete"
                          className="text-muted-foreground hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

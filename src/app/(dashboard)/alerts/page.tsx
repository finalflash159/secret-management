'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, AlertTriangle, Info, Check, Trash2, Eye, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Alert {
  id: string;
  type: string;
  message: string;
  read: boolean;
  projectId: string | null;
  project?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  orgId: string | null;
  org?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  createdAt: string;
}

export default function GlobalAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'unread') {
        params.set('read', 'false');
      }
      const res = await fetch(`/api/alerts?${params}`);
      if (res.ok) {
        const json = await res.json();
        const data = json?.data;
        // Handle both { alerts: [] } and [] response
        setAlerts(data?.alerts ?? data ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/mark-read?id=${alertId}`, { method: 'POST' });
      setAlerts(alerts.map(a =>
        a.id === alertId ? { ...a, read: true } : a
      ));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/alerts/mark-read', { method: 'POST' });
      setAlerts(alerts.map(a => ({ ...a, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      await fetch(`/api/alerts?id=${alertId}`, { method: 'DELETE' });
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Failed to delete alert:', err);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('unread')}
        >
          Unread
        </Button>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-4 rounded-lg border ${
                alert.read
                  ? 'bg-card border-border'
                  : 'bg-primary/5 border-primary/20'
              }`}
            >
              <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${alert.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {alert.message}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {alert.org?.slug ? (
                    <>
                      <Link
                        href={`/organizations/${alert.org.slug}`}
                        className="hover:text-primary hover:underline"
                      >
                        {alert.org.name}
                      </Link>
                      {alert.project && (
                        <>
                          <ChevronRight className="h-3 w-3" />
                          <span>{alert.project.name}</span>
                        </>
                      )}
                    </>
                  ) : (
                    <span>System</span>
                  )}
                  <span className="text-muted-foreground/50">•</span>
                  <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!alert.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAsRead(alert.id)}
                    title="Mark as read"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteAlert(alert.id)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

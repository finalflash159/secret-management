'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { FileText, Filter, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProjectInfo {
  id: string;
  name: string;
  ownerId: string;
  members?: { userId: string }[];
}

interface AuditLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  userId: string;
  user?: {
    name: string | null;
    email: string;
  };
  metadata: Record<string, unknown>;
  createdAt: string;
}

export default function AuditLogsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [hasAccess, setHasAccess] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [orgRes, sessionRes] = await Promise.all([
        fetch(`/api/organizations/${slug}`),
        fetch('/api/auth/session'),
      ]);

      let currentUserId: string | null = null;
      if (orgRes.ok && sessionRes.ok) {
        const orgJson = await orgRes.json();
        const orgData = orgJson?.data ?? orgJson;
        const sessionJson = await sessionRes.json();
        currentUserId = sessionJson?.user?.id ?? null;
        const myMembership = orgData?.members?.find(
          (m: { userId: string }) => m.userId === currentUserId
        );
        const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin';

        // Member chỉ thấy logs từ projects họ có quyền
        // Admin/owner thấy tất cả projects
        const allProjects: ProjectInfo[] = orgData?.projects ?? [];
        const accessibleProjects = isAdmin
          ? allProjects
          : allProjects.filter(
              (p) => p.ownerId === currentUserId || (p.members ?? []).some((m) => m.userId === currentUserId)
            );

        if (accessibleProjects.length === 0) {
          setHasAccess(false);
          setLogs([]);
          setLoading(false);
          return;
        }
        setHasAccess(true);

        // Fetch audit logs for accessible projects
        const allLogs: AuditLog[] = [];
        for (const project of accessibleProjects) {
          const logsRes = await fetch(`/api/projects/${project.id}/audit-logs`);
          if (logsRes.ok) {
            const projectLogs = await logsRes.json();
            const data = Array.isArray(projectLogs) ? projectLogs : (projectLogs?.data ?? []);
            allLogs.push(...data.map((log: AuditLog) => ({
              ...log,
              projectName: project.name,
            })));
          }
        }

        allLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLogs(allLogs);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-success/20 text-success';
      case 'updated':
        return 'bg-info/20 text-info';
      case 'deleted':
        return 'bg-danger/20 text-danger';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(log => log.targetType === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center mb-4">
          <FileText className="h-6 w-6 text-danger" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Chưa có quyền truy cập</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Bạn chưa được thêm vào project nào. Liên hệ admin để được cấp quyền xem audit logs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Track all activities in your projects</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-8 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="all">All Activities</option>
          <option value="secret">Secrets</option>
          <option value="member">Members</option>
          <option value="environment">Environments</option>
          <option value="folder">Folders</option>
        </select>
      </div>

      {/* Logs List */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No audit logs found</div>
          ) : (
            <div className="divide-y divide-border">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-muted/50">
                  <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground capitalize">{log.action}</span>
                      <Badge variant="outline" className="text-xs">{log.targetType}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {log.user?.name || log.user?.email || 'System'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(log.metadata as Record<string, unknown>)?.detail?.toString() || `${log.targetType} ${log.action}`}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

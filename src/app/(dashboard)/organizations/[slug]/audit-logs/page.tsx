'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FileText, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // For now, we'll get logs from all projects in the org
      const res = await fetch(`/api/projects?orgSlug=${slug}`);
      if (res.ok) {
        const projects = await res.json();

        // Fetch audit logs for each project
        const allLogs: AuditLog[] = [];
        for (const project of projects) {
          const logsRes = await fetch(`/api/projects/${project.id}/audit-logs`);
          if (logsRes.ok) {
            const projectLogs = await logsRes.json();
            allLogs.push(...projectLogs.map((log: AuditLog) => ({
              ...log,
              projectName: project.name,
            })));
          }
        }

        // Sort by date descending
        allLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLogs(allLogs);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

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
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredLogs.length === 0 ? (
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

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Pencil,
  Trash2,
  Settings,
  Plus,
  ArrowLeft,
  Key,
  ChevronRight,
  RefreshCw,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface Environment {
  id: string;
  name: string;
  slug: string;
}

interface Folder {
  id: string;
  name: string;
  path: string | null;
}

interface Secret {
  id: string;
  key: string;
  value: string;
  envId: string;
  folderId: string;
  folder?: Folder;
  version: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string | null;
  metadata: Record<string, unknown> | null;
  environment: Environment;
}

interface AuditEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
}

export default function ProjectSecretsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const slug = params.slug as string;

  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEnv, setActiveEnv] = useState<string>('');
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [envName, setEnvName] = useState('');
  const [envSlug, setEnvSlug] = useState('');
  const [teamMembers, setTeamMembers] = useState<{id: string; user: {id: string; email: string; name: string | null}; role: {name: string; slug: string}}[]>([]);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('viewer');
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [selectedSecret, setSelectedSecret] = useState<Secret | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);
  const [showValue, setShowValue] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [secretKey, setSecretKey] = useState('');
  const [secretValue, setSecretValue] = useState('');
  const [secretExpiresAt, setSecretExpiresAt] = useState('');
  const [folderName, setFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [integrations] = useState<{id: string; name: string; connected: boolean}[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [projectName, setProjectName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Fetch audit logs for selected secret
  useEffect(() => {
    if (selectedSecret) {
      fetchAuditLogs(selectedSecret.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSecret?.id]);

  const fetchAuditLogs = async (secretId: string) => {
    try {
      const res = await fetch(`/api/secrets/${secretId}/audit-logs`);
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json?.data || json);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (activeEnv) {
      fetchSecrets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEnv]);

  // Handle imported secrets from header
  useEffect(() => {
    const importSecrets = async () => {
      const imported = sessionStorage.getItem('importedSecrets');
      if (imported && activeEnv) {
        const secrets = JSON.parse(imported);
        // Create secrets one by one
        for (const [key, value] of Object.entries(secrets)) {
          try {
            await fetch(`/api/projects/${projectId}/secrets`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key, value, envId: activeEnv }),
            });
          } catch (err) {
            console.error('Failed to import secret:', key, err);
          }
        }
        sessionStorage.removeItem('importedSecrets');
        fetchSecrets();
      }
    };
    importSecrets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEnv, projectId]);

  // Set up secrets for export
  useEffect(() => {
    if (secrets.length > 0) {
      const exportData: Record<string, string> = {};
      secrets.forEach(s => {
        exportData[s.key] = s.value;
      });
      sessionStorage.setItem('exportSecrets', JSON.stringify(exportData));
    }
  }, [secrets]);

  const fetchProjectData = async () => {
    try {
      const [projectRes, envsRes, foldersRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/environments`),
        fetch(`/api/projects/${projectId}/folders`),
      ]);

      if (projectRes.ok) {
        const projectJson = await projectRes.json();
        const project = projectJson.data || projectJson;
        setProjectName(project.name);
      }

      if (envsRes.ok) {
        const envsJson = await envsRes.json();
        const envs = envsJson.data || envsJson;
        setEnvironments(envs);
        if (envs.length > 0 && !activeEnv) {
          setActiveEnv(envs[0].id);
        }
      }

      if (foldersRes.ok) {
        await foldersRes.json();
        // Folders can be used for UI grouping
      }
    } catch (err) {
      console.error('Failed to fetch project data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSecrets = async () => {
    try {
      // Add decrypt=true to get decrypted values for the secrets list
      const res = await fetch(`/api/projects/${projectId}/secrets?envId=${activeEnv}&decrypt=true`);
      if (res.ok) {
        const json = await res.json();
        // Handle paginated response format
        const data = json?.data?.data ?? json?.data ?? json;
        setSecrets(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch secrets:', err);
    }
  };

  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: secretKey, value: secretValue, envId: activeEnv, expiresAt: secretExpiresAt || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create secret');
        return;
      }

      setShowSecretModal(false);
      setSecretKey('');
      setSecretValue('');
      setSecretExpiresAt('');
      setEditingSecret(null);
      fetchSecrets();
    } catch {
      setError('An error occurred');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSecret) return;

    setError('');
    setCreating(true);

    try {
      const res = await fetch(`/api/secrets/${editingSecret.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: secretKey, value: secretValue, expiresAt: secretExpiresAt || null }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update secret');
        return;
      }

      setShowSecretModal(false);
      setSecretKey('');
      setSecretValue('');
      setEditingSecret(null);
      fetchSecrets();
    } catch {
      setError('An error occurred');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSecret = async (secretId: string) => {
    if (!confirm('Delete this secret?')) return;
    try {
      const res = await fetch(`/api/secrets/${secretId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSecrets();
        if (selectedSecret?.id === secretId) {
          setSelectedSecret(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleRotateSecret = async (secretId: string) => {
    // Generate new random value
    const newValue = crypto.randomUUID();
    try {
      const res = await fetch(`/api/secrets/${secretId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newValue }),
      });
      if (res.ok) {
        fetchSecrets();
      }
    } catch (err) {
      console.error('Failed to rotate:', err);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderName, envId: activeEnv }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create folder');
        return;
      }
      setShowFolderModal(false);
      setFolderName('');
      fetchProjectData();
    } catch {
      setError('An error occurred');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateEnv = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/environments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: envName, slug: envSlug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create environment');
        return;
      }
      setShowEnvModal(false);
      setEnvName('');
      setEnvSlug('');
      fetchProjectData();
    } catch {
      setError('An error occurred');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEnv = async (envId: string) => {
    if (!confirm('Are you sure? This will delete all secrets in this environment.')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/environments/${envId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchProjectData();
      }
    } catch {
      setError('Failed to delete environment');
    }
  };

  const handleDeleteProject = async () => {
    if (deleteConfirmText !== projectName) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push(`/organizations/${slug}`);
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
    } finally {
      setDeleting(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (res.ok) {
        const json = await res.json();
        setTeamMembers(json?.data ?? json);
      }
    } catch (err) {
      console.error('Failed to fetch team members:', err);
    }
  };

  const openTeamModal = () => {
    setShowTeamModal(true);
    fetchTeamMembers();
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      // Get roles first
      const rolesRes = await fetch(`/api/projects/${projectId}/roles`);
      const rolesJson = await rolesRes.json();
      const roles = rolesJson.data || rolesJson;
      const selectedRole = roles.find((r: {slug: string}) => r.slug === memberRole);

      if (!selectedRole) {
        setError('Role not found');
        return;
      }

      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: memberEmail, roleId: selectedRole.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add member');
        return;
      }
      setMemberEmail('');
      fetchTeamMembers();
    } catch {
      setError('An error occurred');
    } finally {
      setCreating(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member?')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchTeamMembers();
      }
    } catch {
      setError('Failed to remove member');
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRoleSlug: string) => {
    try {
      // Get roles first
      const rolesRes = await fetch(`/api/projects/${projectId}/roles`);
      const rolesJson = await rolesRes.json();
      const roles = rolesJson.data || rolesJson;
      const selectedRole = roles.find((r: {slug: string}) => r.slug === newRoleSlug);

      if (!selectedRole) {
        setError('Role not found');
        return;
      }

      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: selectedRole.id }),
      });
      if (res.ok) {
        fetchTeamMembers();
      }
    } catch {
      setError('Failed to update member role');
    }
  };

  const openEditModal = (secret: Secret) => {
    setEditingSecret(secret);
    setSecretKey(secret.key);
    setSecretValue(secret.value);
    setSecretExpiresAt(secret.expiresAt ? secret.expiresAt.split('T')[0] : '');
    setShowSecretModal(true);
  };

  const toggleSecretVisibility = (secretId: string) => {
    const newVisible = new Set(visibleSecrets);
    if (newVisible.has(secretId)) newVisible.delete(secretId);
    else newVisible.add(secretId);
    setVisibleSecrets(newVisible);
  };

  const copyToClipboard = async (secret: Secret) => {
    try {
      await navigator.clipboard.writeText(secret.value);
      setCopiedSecret(secret.id);
      setTimeout(() => setCopiedSecret(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getEnvDot = (envSlug: string) => {
    const s = envSlug.toLowerCase();
    if (s === 'prod' || s === 'production') return 'bg-prod';
    if (s === 'staging') return 'bg-staging';
    if (s === 'dev' || s === 'development') return 'bg-dev';
    return 'bg-test';
  };

  const getEnvBadgeVariant = (envSlug: string) => {
    const s = envSlug.toLowerCase();
    if (s === 'prod' || s === 'production') return 'env-prod';
    if (s === 'staging') return 'env-staging';
    if (s === 'dev' || s === 'development') return 'env-dev';
    return 'env-test';
  };

  const filteredSecrets = secrets.filter(s => s.envId === activeEnv && s.key.toLowerCase().includes(searchQuery.toLowerCase()));
  const activeEnvData = environments.find(e => e.id === activeEnv);

  // Mock audit data for selected secret
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-0">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className={`flex-1 min-w-0 flex flex-col overflow-hidden ${selectedSecret ? 'pr-2' : ''}`}>
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/organizations/${slug}`} className="p-1.5 hover:bg-muted rounded-md transition-colors">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Key className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground">Secrets</h1>
                <p className="text-xs text-muted-foreground">{activeEnvData?.name}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSettingsModal(true)}>
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
            <Button size="sm" onClick={() => { setEditingSecret(null); setSecretKey(''); setSecretValue(''); setSecretExpiresAt(''); setShowSecretModal(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Add Secret
            </Button>
          </div>
        </div>

        {/* Environment Tabs */}
        <div className="flex items-center gap-1 mb-4 p-1 bg-card rounded-lg border border-border w-fit">
          {environments.map((env) => (
            <button
              key={env.id}
              onClick={() => setActiveEnv(env.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                activeEnv === env.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeEnv === env.id ? 'bg-primary-foreground' : getEnvDot(env.slug)}`} />
              {env.name}
            </button>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search secrets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </div>
          <Button variant="outline" size="sm">
            <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Sort
          </Button>
          <div className="ml-auto">
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              Reveal All
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        {(() => {
          const totalSecrets = secrets.length;
          const now = new Date();
          const expiringSoon = secrets.filter(s => s.expiresAt && new Date(s.expiresAt) < now).length;
          const lastUpdated = secrets.length > 0
            ? secrets.reduce((latest, s) => new Date(s.updatedAt) > latest ? new Date(s.updatedAt) : latest, new Date(0))
            : null;
          const syncTime = lastUpdated
            ? Math.floor((now.getTime() - lastUpdated.getTime()) / 60000)
            : null;
          const syncText = syncTime === null ? 'Never' : syncTime < 1 ? 'Just now' : syncTime < 60 ? `${syncTime}m ago` : `${Math.floor(syncTime / 60)}h ago`;
          const connectedIntegrations = integrations.filter(i => i.connected).length;
          const integrationNames = integrations.filter(i => i.connected).slice(0, 2).map(i => i.name).join(', ');
          const moreIntegrations = connectedIntegrations > 2 ? ` +${connectedIntegrations - 2}` : '';

          return (
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[11px] font-medium text-muted-foreground">Total Secrets</p>
              <p className="text-xl font-extrabold text-foreground mt-0.5">{totalSecrets}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[11px] font-medium text-muted-foreground">Last Synced</p>
              <p className="text-sm font-bold text-foreground mt-0.5 pt-1">{syncText}</p>
              <p className="text-[10px] text-success mt-0.5">{secrets.length > 0 ? 'All healthy' : 'No secrets'}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[11px] font-medium text-muted-foreground">Expiring Soon</p>
              <p className="text-xl font-extrabold text-danger mt-0.5">{expiringSoon}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{expiringSoon > 0 ? 'Rotation needed' : 'All good'}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[11px] font-medium text-muted-foreground">Active Integrations</p>
              <p className="text-xl font-extrabold text-foreground mt-0.5">{connectedIntegrations}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{connectedIntegrations > 0 ? `${integrationNames}${moreIntegrations}` : 'None connected'}</p>
            </div>
          </div>
          );
        })()}

        {/* Secrets Table */}
        {filteredSecrets.length === 0 ? (
          <Card className="border-dashed border-2 border-border bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Key className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No secrets</h3>
              <p className="mt-1 text-xs text-muted-foreground">Add your first secret</p>
              <Button size="sm" className="mt-4" onClick={() => { setEditingSecret(null); setShowSecretModal(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Add Secret
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card overflow-hidden flex-1 flex flex-col min-h-0">
            {/* Table Header */}
            <div className="grid grid-cols-[28px_3fr_2fr_1fr_1fr_80px] items-center px-4 h-9 border-b border-border bg-muted/50 overflow-hidden">
              <div></div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground min-w-0">
                Key
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground min-w-0">Value</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">Environment</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground shrink-0">
                Updated
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-border">
              {filteredSecrets.map((secret) => (
                <div
                  key={secret.id}
                  className={`grid grid-cols-[28px_3fr_2fr_1fr_1fr_80px] items-center px-4 h-11 cursor-pointer transition-colors hover:bg-muted/50 overflow-hidden ${
                    selectedSecret?.id === secret.id ? 'bg-gold/5 border-l-2 border-l-gold' : ''
                  }`}
                  onClick={() => setSelectedSecret(secret)}
                >
                  {/* Checkbox */}
                  <div className={`w-4 h-4 rounded border shrink-0 ${selectedSecret?.id === secret.id ? 'bg-primary border-primary' : 'border-border'}`}>
                    {selectedSecret?.id === secret.id && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>

                  {/* Key */}
                  <div className="flex items-center gap-2 font-mono-secret text-foreground min-w-0">
                    <Key className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{secret.key}</span>
                  </div>

                  {/* Value */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono-secret text-muted-foreground truncate min-w-0">
                      {visibleSecrets.has(secret.id) ? secret.value : '••••••••••••••••••••'}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSecretVisibility(secret.id); }}
                        className="p-1 rounded hover:bg-muted"
                      >
                        {visibleSecrets.has(secret.id) ? (
                          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(secret); }}
                        className="p-1 rounded hover:bg-muted"
                      >
                        {copiedSecret === secret.id ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Environment */}
                  <div className="shrink-0">
                    <Badge variant={getEnvBadgeVariant(secret.environment?.slug || 'prod')}>
                      {secret.environment?.name || 'prod'}
                    </Badge>
                  </div>

                  {/* Updated */}
                  <div className="text-xs text-muted-foreground shrink-0">
                    {new Date(secret.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRotateSecret(secret.id); }}
                      className="p-1.5 rounded hover:bg-muted"
                      title="Rotate secret"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(secret); }}
                      className="p-1.5 rounded hover:bg-muted/80"
                    >
                      <Pencil className="h-4 w-4 text-foreground" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSecret(secret.id); }}
                      className="p-1.5 rounded hover:bg-danger/20"
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Row */}
            <div
              className="flex items-center gap-2 px-4 py-2.5 border-t border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => { setEditingSecret(null); setSecretKey(''); setSecretValue(''); setShowSecretModal(true); }}
            >
              <div className="w-5 h-5 rounded border border-dashed border-border flex items-center justify-center text-muted-foreground">
                <Plus className="h-3 w-3" />
              </div>
              <span className="text-xs text-muted-foreground">Add new secret...</span>
            </div>
          </Card>
        )}
      </div>

      {/* Right Panel - Secret Detail */}
      {selectedSecret && (
        <div className="w-[300px] border border-border bg-card flex flex-col overflow-hidden animate-slideInRight rounded-lg ml-2">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <span className="text-sm font-bold text-foreground font-mono-secret truncate">{selectedSecret.key}</span>
            <button
              onClick={() => setSelectedSecret(null)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Value Section */}
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Value</p>
              <div className="rounded-lg border border-border bg-muted/50 p-3 mb-2">
                <p className="font-mono-secret text-sm text-foreground break-all">
                  {showValue ? selectedSecret.value : '••••••••••••••••••••'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center"
                onClick={() => setShowValue(!showValue)}
              >
                {showValue ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                {showValue ? 'Hide value' : 'Reveal value'}
              </Button>
            </div>

            {/* Metadata Section */}
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Metadata</p>
              <div className="space-y-0">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-xs text-muted-foreground">Environment</span>
                  <Badge variant={getEnvBadgeVariant(selectedSecret.environment?.slug || 'prod')}>
                    {selectedSecret.environment?.name || 'prod'}
                  </Badge>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-xs text-muted-foreground">Path</span>
                  <span className="text-xs font-mono-secret text-foreground">/{selectedSecret.folder?.name || ''}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-xs text-muted-foreground">Version</span>
                  <span className="text-xs font-semibold text-foreground">v{selectedSecret.version}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-xs text-muted-foreground">Created</span>
                  <span className="text-xs text-foreground">
                    {new Date(selectedSecret.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-xs text-muted-foreground">Updated</span>
                  <span className="text-xs text-foreground">
                    {new Date(selectedSecret.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-xs text-muted-foreground">Updated by</span>
                  <span className="text-xs text-foreground">{selectedSecret.updatedBy || selectedSecret.createdBy || 'Unknown'}</span>
                </div>
              </div>
            </div>

            {/* Comment Section */}
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Comment</p>
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 leading-relaxed">
                {(selectedSecret.metadata?.description as string) || 'No description'}
              </div>
            </div>

            {/* Audit Trail */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Audit Trail</p>
              <div className="space-y-3">
                {auditLogs.length > 0 ? auditLogs.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs text-foreground">
                        <span className="font-semibold">{entry.user}</span> {entry.action}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{entry.timestamp}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-muted-foreground">No audit history</p>
                )}
              </div>
            </div>
          </div>

          {/* Panel Footer */}
          <div className="p-4 border-t border-border flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 justify-center" onClick={() => openEditModal(selectedSecret)}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button variant="gold" size="sm" className="flex-1 justify-center">
              <RefreshCwIcon className="h-4 w-4 mr-1" />
              Rotate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger/10"
              onClick={() => handleDeleteSecret(selectedSecret.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Secret Modal */}
      <Modal
        isOpen={showSecretModal}
        onClose={() => { setShowSecretModal(false); setEditingSecret(null); setSecretExpiresAt(''); setShowValue(false); }}
        title={editingSecret ? 'Edit Secret' : 'New Secret'}
      >
        <form onSubmit={editingSecret ? handleUpdateSecret : handleCreateSecret} className="space-y-4">
          {error && <div className="text-xs text-danger">{error}</div>}
          <div className="space-y-1.5">
            <Label htmlFor="key">Key</Label>
            <Input
              id="key"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value.toUpperCase().replace(/ /g, '_'))}
              placeholder="API_KEY"
              className="font-mono h-8"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="value">Value</Label>
            <div className="relative">
              <textarea
                id="value"
                value={secretValue}
                onChange={(e) => setSecretValue(e.target.value)}
                placeholder="secret value (supports multiline)"
                className="font-mono min-h-[80px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
            <Input
              id="expiresAt"
              type="date"
              value={secretExpiresAt}
              onChange={(e) => setSecretExpiresAt(e.target.value)}
              className="h-8"
            />
            <p className="text-xs text-muted-foreground">Secret will show as expiring after this date</p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => { setShowSecretModal(false); setEditingSecret(null); setSecretExpiresAt(''); setShowValue(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating} size="sm">
              {creating ? 'Saving...' : editingSecret ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Folder Modal */}
      <Modal isOpen={showFolderModal} onClose={() => { setShowFolderModal(false); setFolderName(''); }} title="New Folder">
        <form onSubmit={handleCreateFolder} className="space-y-4">
          {error && <div className="text-xs text-danger">{error}</div>}
          <div className="space-y-1.5">
            <Label htmlFor="folderName">Name</Label>
            <Input
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="production"
              className="h-8"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowFolderModal(false)}>Cancel</Button>
            <Button type="submit" disabled={creating} size="sm">{creating ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Settings Modal */}
      <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="Settings">
        <div className="space-y-4">
          {/* Environments Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground">Environments</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEnvModal(true)}
                className="h-6 text-xs"
              >
                Add
              </Button>
            </div>
            <div className="space-y-1">
              {environments.map((env) => (
                <div
                  key={env.id}
                  className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full bg-${env.slug}`} />
                    <span className="text-sm text-foreground">{env.name}</span>
                    <span className="text-xs text-muted-foreground">({env.slug})</span>
                  </div>
                  <button
                    onClick={() => handleDeleteEnv(env.id)}
                    className="text-xs text-danger hover:text-danger/80"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {environments.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">No environments yet</p>
              )}
            </div>
          </div>

          <div className="border-t border-border pt-2">
            <div
              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted cursor-pointer"
              onClick={openTeamModal}
            >
              <div>
                <p className="text-sm font-medium text-foreground">Team</p>
                <p className="text-xs text-muted-foreground">Manage members</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border-t border-border pt-4 mt-4">
            <h3 className="text-sm font-semibold text-danger mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </h3>
            <div className="rounded-lg border border-danger/20 bg-danger/5 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Delete Project</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Once deleted, all secrets will be permanently lost.
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Team Modal */}
      <Modal isOpen={showTeamModal} onClose={() => setShowTeamModal(false)} title="Team Members">
        <div className="space-y-4">
          {/* Add Member Form */}
          <form onSubmit={handleAddMember} className="flex gap-2">
            <Input
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="User email"
              className="h-8 flex-1"
              required
            />
            <select
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button type="submit" disabled={creating} size="sm">Add</Button>
          </form>

          {/* Members List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted">
                <div className="flex-1">
                  <p className="text-sm text-foreground">{member.user.name || member.user.email}</p>
                  <select
                    value={member.role.slug}
                    onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                    className="text-xs mt-1 rounded border border-border bg-background px-2 py-1"
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="text-xs text-danger hover:text-danger/80 ml-2"
                >
                  Remove
                </button>
              </div>
            ))}
            {teamMembers.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No members yet</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Project Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
        title="Delete Project"
      >
        <div className="space-y-4">
          <div className="rounded-md bg-danger/10 p-3 border border-danger/20">
            <p className="text-sm text-danger font-medium">
              This action cannot be undone.
            </p>
            <p className="text-xs text-danger/80 mt-1">
              All secrets and data associated with this project will be permanently deleted.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmDelete">
              Type <span className="font-mono font-bold">{projectName}</span> to confirm
            </Label>
            <Input
              id="confirmDelete"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={projectName}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={deleteConfirmText !== projectName || deleting}
              onClick={handleDeleteProject}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Project'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Environment Modal */}
      <Modal isOpen={showEnvModal} onClose={() => { setShowEnvModal(false); setEnvName(''); setEnvSlug(''); }} title="New Environment">
        <form onSubmit={handleCreateEnv} className="space-y-4">
          {error && <div className="text-xs text-danger">{error}</div>}
          <div className="space-y-1.5">
            <Label htmlFor="envName">Name</Label>
            <Input
              id="envName"
              value={envName}
              onChange={(e) => {
                setEnvName(e.target.value);
                setEnvSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
              }}
              placeholder="Production"
              className="h-8"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="envSlug">Slug</Label>
            <Input
              id="envSlug"
              value={envSlug}
              onChange={(e) => setEnvSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="production"
              className="h-8"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowEnvModal(false)}>Cancel</Button>
            <Button type="submit" disabled={creating} size="sm">{creating ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Refresh icon component
function RefreshCwIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function Search({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

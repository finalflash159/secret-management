'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Database, Server, Key, Plus, RotateCw, Trash2, Loader2, Clock, CheckCircle, XCircle, Play, Pause, Eye, Copy, Check, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useToast } from '@/components/ui/toast';

interface Environment {
  id: string;
  name: string;
  slug: string;
}

interface DynamicSecret {
  id: string;
  name: string;
  provider: string;
  envId: string;
  environment: Environment;
  rotationPeriod: number;
  lastRotatedAt: string | null;
  nextRotationAt: string | null;
  config: {
    host: string;
    port: number;
    database?: string;
  };
  _count: {
    credentials: number;
  };
}

interface RotationJob {
  id: string;
  name: string;
  cronExpression: string;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  dynamicSecret: DynamicSecret;
}

interface Credential {
  id: string;
  username: string;
  password: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  ownerId: string;
  members?: { userId: string }[];
}

const providers = [
  { id: 'postgresql', name: 'PostgreSQL', icon: Database, color: 'text-blue-500' },
  { id: 'mysql', name: 'MySQL', icon: Database, color: 'text-orange-500' },
  { id: 'mongodb', name: 'MongoDB', icon: Database, color: 'text-green-500' },
  { id: 'redis', name: 'Redis', icon: Server, color: 'text-red-500' },
];

const cronOptions = [
  { value: '0 * * * *', label: 'Every hour' },
  { value: '0 0 * * *', label: 'Daily at midnight' },
  { value: '0 0 * * 0', label: 'Weekly (Sunday)' },
  { value: '0 0 1 * *', label: 'Monthly (1st)' },
];

export default function DynamicSecretsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { addToast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [dynamicSecrets, setDynamicSecrets] = useState<DynamicSecret[]>([]);
  const [rotationJobs, setRotationJobs] = useState<RotationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [userOrgRole, setUserOrgRole] = useState<string | null>(null);
  const [rotating, setRotating] = useState<string | null>(null);

  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedEnv, setSelectedEnv] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'secrets' | 'rotation'>('secrets');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [saving, setSaving] = useState(false);
  // Confirm modals
  const [confirmDeleteSecret, setConfirmDeleteSecret] = useState<DynamicSecret | null>(null);
  const [confirmDeleteJob, setConfirmDeleteJob] = useState<RotationJob | null>(null);
  const [viewingSecret, setViewingSecret] = useState<DynamicSecret | null>(null);
  const [credentials, setCredentials] = useState<Credential | null>(null);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form state
  const [secretName, setSecretName] = useState('');
  const [secretProvider, setSecretProvider] = useState<string>('postgresql');
  const [rotationPeriod, setRotationPeriod] = useState(86400);
  const [configHost, setConfigHost] = useState('');
  const [configPort, setConfigPort] = useState('');
  const [configDatabase, setConfigDatabase] = useState('');
  const [configUsername, setConfigUsername] = useState('');
  const [configPassword, setConfigPassword] = useState('');

  // Rotation job form
  const [rotationJobName, setRotationJobName] = useState('');
  const [rotationSecretId, setRotationSecretId] = useState('');
  const [rotationCron, setRotationCron] = useState('0 0 * * *');

  const fetchProjects = useCallback(async () => {
    try {
      const [orgRes, sessionRes] = await Promise.all([
        fetch(`/api/organizations/${slug}`),
        fetch('/api/auth/session'),
      ]);

      // Read orgRes body ONCE
      const orgData = orgRes.ok ? (await orgRes.json())?.data ?? null : null;
      const sessionJson = sessionRes.ok ? await sessionRes.json() : null;
      const userId = sessionJson?.user?.id;

      if (orgData && sessionJson && userId) {
        const myMembership = orgData.members?.find(
          (m: { userId: string }) => m.userId === userId
        );
        setUserOrgRole(myMembership?.role ?? null);

        const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin';

        // Filter to only projects the user has access to
        const allProjects: Project[] = orgData.projects ?? [];
        const accessibleProjects = isAdmin
          ? allProjects
          : allProjects.filter(
              (p) => p.ownerId === userId || (p.members ?? []).some((m: { userId: string }) => m.userId === userId)
            );

        setProjects(accessibleProjects);
        if (accessibleProjects.length > 0) {
          setSelectedProject(accessibleProjects[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchEnvironments = useCallback(async () => {
    if (!selectedProject) {
      setEnvironments([]);
      return;
    }
    try {
      const res = await fetch(`/api/projects/${selectedProject}/environments`);
      if (res.ok) {
        const json = await res.json();
        setEnvironments(json?.data ?? json);
        if ((json?.data ?? json)?.length > 0) {
          setSelectedEnv((json?.data ?? json)[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch environments:', err);
    }
  }, [selectedProject]);

  const fetchDynamicSecrets = useCallback(async () => {
    if (!selectedProject || !selectedEnv) {
      setDynamicSecrets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject}/dynamic-secrets?envId=${selectedEnv}`);
      if (res.ok) {
        const json = await res.json();
        setDynamicSecrets(json?.data ?? json);
      }
    } catch (err) {
      console.error('Failed to fetch dynamic secrets:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProject, selectedEnv]);

  const fetchRotationJobs = useCallback(async () => {
    if (!selectedProject) {
      setRotationJobs([]);
      return;
    }

    try {
      const res = await fetch(`/api/projects/${selectedProject}/rotation-jobs`);
      if (res.ok) {
        const json = await res.json();
        setRotationJobs(json?.data ?? json);
      }
    } catch (err) {
      console.error('Failed to fetch rotation jobs:', err);
    }
  }, [selectedProject]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchEnvironments();
  }, [fetchEnvironments, selectedProject]);

  useEffect(() => {
    fetchDynamicSecrets();
  }, [fetchDynamicSecrets]);

  useEffect(() => {
    fetchRotationJobs();
  }, [fetchRotationJobs]);

  const resetForm = () => {
    setSecretName('');
    setSecretProvider('postgresql');
    setRotationPeriod(86400);
    setConfigHost('');
    setConfigPort('');
    setConfigDatabase('');
    setConfigUsername('');
    setConfigPassword('');
  };

  const resetRotationForm = () => {
    setRotationJobName('');
    setRotationSecretId('');
    setRotationCron('0 0 * * *');
  };

  const handleProviderChange = (provider: string) => {
    setSecretProvider(provider);
    const ports: Record<string, string> = {
      postgresql: '5432',
      mysql: '3306',
      mongodb: '27017',
      redis: '6379',
    };
    setConfigPort(ports[provider] || '');
  };

  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !selectedEnv) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject}/dynamic-secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: secretName,
          provider: secretProvider,
          envId: selectedEnv,
          rotationPeriod,
          config: {
            host: configHost,
            port: parseInt(configPort) || 5432,
            database: configDatabase,
            username: configUsername,
            adminPassword: configPassword,
          },
        }),
      });

      if (res.ok) {
        addToast({ title: 'Dynamic secret created', variant: 'success' });
        setShowCreateModal(false);
        resetForm();
        fetchDynamicSecrets();
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Failed to create', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSecret = async () => {
    const item = confirmDeleteSecret;
    if (!item) return;
    if (!selectedProject) return;

    try {
      const res = await fetch(`/api/projects/${selectedProject}/dynamic-secrets/${item.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        addToast({ title: 'Dynamic secret deleted', variant: 'success' });
        fetchDynamicSecrets();
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Failed to delete', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    } finally {
      setConfirmDeleteSecret(null);
    }
  };

  const handleRotate = async (secret: DynamicSecret) => {
    if (!selectedProject) return;

    setRotating(secret.id);
    try {
      const res = await fetch(
        `/api/projects/${selectedProject}/dynamic-secrets/${secret.id}?action=rotate`,
        { method: 'POST' }
      );

      if (res.ok) {
        addToast({ title: 'Credentials generated', variant: 'success' });
        fetchRotationJobs();
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Failed to rotate', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    } finally {
      setRotating(null);
    }
  };

  const handleViewCredentials = async (secret: DynamicSecret) => {
    if (!selectedProject) return;

    setViewingSecret(secret);
    setShowCredentialsModal(true);
    setLoadingCredentials(true);
    setCredentials(null);
    setShowPassword(false);

    try {
      // First try to get existing credentials
      const res = await fetch(
        `/api/projects/${selectedProject}/dynamic-secrets/${secret.id}?action=credentials`
      );

      if (res.ok) {
        const json = await res.json();
        setCredentials(json?.data ?? json);
      } else {
        // No credentials yet, auto-generate
        setRotating(secret.id);
        const rotateRes = await fetch(
          `/api/projects/${selectedProject}/dynamic-secrets/${secret.id}?action=rotate`,
          { method: 'POST' }
        );

        if (rotateRes.ok) {
          // Fetch the newly created credentials
          const credRes = await fetch(
            `/api/projects/${selectedProject}/dynamic-secrets/${secret.id}?action=credentials`
          );
          if (credRes.ok) {
            const json = await credRes.json();
            setCredentials(json?.data ?? json);
            addToast({ title: 'Credentials generated', variant: 'success' });
          }
        } else {
          const data = await rotateRes.json();
          addToast({ title: data.error || 'Failed to generate credentials', variant: 'error' });
          setShowCredentialsModal(false);
        }
        setRotating(null);
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    } finally {
      setLoadingCredentials(false);
    }
  };

  const handleCopyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      addToast({ title: 'Failed to copy', variant: 'error' });
    }
  };

  const handleCreateRotationJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !rotationSecretId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject}/rotation-jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rotationJobName,
          dynamicSecretId: rotationSecretId,
          cronExpression: rotationCron,
        }),
      });

      if (res.ok) {
        addToast({ title: 'Rotation job created', variant: 'success' });
        setShowRotationModal(false);
        resetRotationForm();
        fetchRotationJobs();
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Failed to create', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleJob = async (job: RotationJob) => {
    if (!selectedProject) return;

    try {
      const res = await fetch(`/api/projects/${selectedProject}/rotation-jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !job.isActive }),
      });

      if (res.ok) {
        addToast({ title: job.isActive ? 'Job paused' : 'Job enabled', variant: 'success' });
        fetchRotationJobs();
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Failed to update', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    }
  };

  const handleRunJobNow = async (job: RotationJob) => {
    if (!selectedProject) return;

    setRotating(job.id);
    try {
      const res = await fetch(`/api/projects/${selectedProject}/rotation-jobs/${job.id}/run`, {
        method: 'POST',
      });

      if (res.ok) {
        addToast({ title: 'Rotation triggered', variant: 'success' });
        fetchRotationJobs();
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Failed to run', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    } finally {
      setRotating(null);
    }
  };

  const handleDeleteJob = async () => {
    const item = confirmDeleteJob;
    if (!item) return;
    if (!selectedProject) return;

    try {
      const res = await fetch(`/api/projects/${selectedProject}/rotation-jobs/${item.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        addToast({ title: 'Rotation job deleted', variant: 'success' });
        fetchRotationJobs();
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Failed to delete', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    } finally {
      setConfirmDeleteJob(null);
    }
  };

  const getProviderIcon = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      const Icon = provider.icon;
      return <Icon className={`h-5 w-5 ${provider.color}`} />;
    }
    return <Key className="h-5 w-5" />;
  };

  const formatRotationPeriod = (seconds: number) => {
    if (seconds === 3600) return '1 hour';
    if (seconds === 86400) return '24 hours';
    if (seconds === 604800) return '7 days';
    return `${seconds / 3600} hours`;
  };

  const formatCron = (cron: string) => {
    const option = cronOptions.find(c => c.value === cron);
    return option?.label || cron;
  };

  if (!userOrgRole || userOrgRole === 'member') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center mb-4">
          <Shield className="h-6 w-6 text-danger" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          You need admin or owner role to manage dynamic secrets.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dynamic Secrets</h1>
          <p className="text-sm text-muted-foreground">Automatically generated credentials that rotate periodically</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'secrets' ? (
            <Button onClick={() => setShowCreateModal(true)} disabled={!selectedProject || !selectedEnv}>
              <Plus className="h-4 w-4 mr-2" />
              New Dynamic Secret
            </Button>
          ) : (
            <Button onClick={() => setShowRotationModal(true)} disabled={!selectedProject || dynamicSecrets.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              New Rotation Job
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab('secrets')}
          aria-pressed={activeTab === 'secrets'}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'secrets'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Secrets
        </button>
        <button
          onClick={() => setActiveTab('rotation')}
          aria-pressed={activeTab === 'rotation'}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'rotation'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Rotation Jobs
        </button>
      </div>

      {/* Project & Environment Selectors */}
      <div className={`grid gap-4 ${activeTab === 'secrets' ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
        <div className="flex-1">
          <Label htmlFor="project">Project</Label>
          <select
            id="project"
            value={selectedProject}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              setSelectedEnv('');
            }}
            className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            <option value="">Select project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {activeTab === 'secrets' && (
          <div className="flex-1">
            <Label htmlFor="env">Environment</Label>
            <select
              id="env"
              value={selectedEnv}
              onChange={(e) => setSelectedEnv(e.target.value)}
              disabled={!selectedProject}
              className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50"
            >
              <option value="">Select environment</option>
              {environments.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Dynamic Secrets Tab */}
      {activeTab === 'secrets' && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            {!selectedProject || !selectedEnv ? (
              <div className="p-8 text-center text-muted-foreground">
                <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Select a project and environment to view dynamic secrets</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : dynamicSecrets.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Key className="mx-auto mb-3 h-8 w-8 opacity-50" />
                <p className="text-base font-medium text-foreground">No dynamic secrets yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Create a dynamic secret to generate rotating credentials.</p>
                <Button className="mt-4" size="sm" onClick={() => setShowCreateModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Dynamic Secret
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {dynamicSecrets.map((secret) => (
                  <div
                    key={secret.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {getProviderIcon(secret.provider)}
                      <div>
                        <p className="text-sm font-medium text-foreground">{secret.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {secret.config.host}:{secret.config.port}
                          {secret.config.database && ` / ${secret.config.database}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Rotation</p>
                        <p className="text-sm text-foreground">{formatRotationPeriod(secret.rotationPeriod)}</p>
                      </div>
                      {secret.nextRotationAt && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Next rotation</p>
                          <p className="text-sm text-foreground">
                            {new Date(secret.nextRotationAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`View credentials for ${secret.name}`}
                          className="h-8 w-8 p-0"
                          onClick={() => handleViewCredentials(secret)}
                          title="View credentials"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Rotate credentials for ${secret.name}`}
                          className="h-8 w-8 p-0"
                          onClick={() => handleRotate(secret)}
                          disabled={rotating === secret.id}
                          title="Rotate credentials"
                        >
                          {rotating === secret.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete dynamic secret ${secret.name}`}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-danger"
                          onClick={() => setConfirmDeleteSecret(secret)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rotation Jobs Tab */}
      {activeTab === 'rotation' && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            {!selectedProject ? (
              <div className="p-8 text-center text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Select a project to view rotation jobs</p>
              </div>
            ) : rotationJobs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Clock className="mx-auto mb-3 h-8 w-8 opacity-50" />
                <p className="text-base font-medium text-foreground">No rotation jobs yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Create a rotation job to automate credential rotation.</p>
                {dynamicSecrets.length === 0 ? (
                  <Button className="mt-4" size="sm" variant="outline" onClick={() => setActiveTab('secrets')}>
                    <Key className="mr-2 h-4 w-4" />
                    Create a Dynamic Secret First
                  </Button>
                ) : (
                  <Button className="mt-4" size="sm" onClick={() => setShowRotationModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Rotation Job
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {rotationJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{job.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {job.dynamicSecret.name} • {formatCron(job.cronExpression)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <div className="flex items-center gap-1">
                          {job.isActive ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="text-sm text-foreground">
                            {job.isActive ? 'Active' : 'Paused'}
                          </span>
                        </div>
                      </div>
                      {job.nextRunAt && job.isActive && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Next run</p>
                          <p className="text-sm text-foreground">
                            {new Date(job.nextRunAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`${job.isActive ? 'Pause' : 'Enable'} rotation job ${job.name}`}
                          className="h-8 w-8 p-0"
                          onClick={() => handleToggleJob(job)}
                          title={job.isActive ? 'Pause' : 'Enable'}
                        >
                          {job.isActive ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Run rotation job ${job.name} now`}
                          className="h-8 w-8 p-0"
                          onClick={() => handleRunJobNow(job)}
                          disabled={rotating === job.id}
                          title="Run now"
                        >
                          {rotating === job.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete rotation job ${job.name}`}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-danger"
                          onClick={() => setConfirmDeleteJob(job)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Dynamic Secret Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetForm(); }}
        title="Create Dynamic Secret"
      >
        <form onSubmit={handleCreateSecret} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={secretName}
              onChange={(e) => setSecretName(e.target.value)}
              placeholder="e.g., Production Database"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Provider</Label>
            <div className="grid grid-cols-4 gap-2">
              {providers.map((provider) => {
                const Icon = provider.icon;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => handleProviderChange(provider.id)}
                    aria-pressed={secretProvider === provider.id}
                    aria-label={`Use ${provider.name} as provider`}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      secretProvider === provider.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mx-auto ${provider.color}`} />
                    <span className="text-xs mt-1 block">{provider.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="host">Host</Label>
              <Input
                id="host"
                value={configHost}
                onChange={(e) => setConfigHost(e.target.value)}
                placeholder="localhost"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                value={configPort}
                onChange={(e) => setConfigPort(e.target.value)}
                placeholder="5432"
                required
              />
            </div>
          </div>

          {secretProvider !== 'redis' && (
            <div className="space-y-1.5">
              <Label htmlFor="database">Database</Label>
              <Input
                id="database"
                value={configDatabase}
                onChange={(e) => setConfigDatabase(e.target.value)}
                placeholder="mydb"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Admin Username</Label>
              <Input
                id="username"
                value={configUsername}
                onChange={(e) => setConfigUsername(e.target.value)}
                placeholder="postgres"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                type="password"
                value={configPassword}
                onChange={(e) => setConfigPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rotation">Rotation Period</Label>
            <select
              id="rotation"
              value={rotationPeriod}
              onChange={(e) => setRotationPeriod(parseInt(e.target.value))}
              className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <option value={3600}>1 hour</option>
              <option value={86400}>24 hours</option>
              <option value={604800}>7 days</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { setShowCreateModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} size="sm">
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Rotation Job Modal */}
      <Modal
        isOpen={showRotationModal}
        onClose={() => { setShowRotationModal(false); resetRotationForm(); }}
        title="Create Rotation Job"
      >
        <form onSubmit={handleCreateRotationJob} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="jobName">Job Name</Label>
            <Input
              id="jobName"
              value={rotationJobName}
              onChange={(e) => setRotationJobName(e.target.value)}
              placeholder="e.g., Daily DB Rotation"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="secret">Dynamic Secret</Label>
            <select
              id="secret"
              value={rotationSecretId}
              onChange={(e) => setRotationSecretId(e.target.value)}
              required
              className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <option value="">Select a dynamic secret</option>
              {dynamicSecrets.map(secret => (
                <option key={secret.id} value={secret.id}>{secret.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cron">Schedule</Label>
            <select
              id="cron"
              value={rotationCron}
              onChange={(e) => setRotationCron(e.target.value)}
              className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              {cronOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { setShowRotationModal(false); resetRotationForm(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !rotationSecretId} size="sm">
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Credentials Modal */}
      <Modal
        isOpen={showCredentialsModal}
        onClose={() => { setShowCredentialsModal(false); setCredentials(null); setViewingSecret(null); }}
        title="Credentials"
      >
        {loadingCredentials ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : credentials ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Username</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-sm font-mono bg-transparent">{credentials.username}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Copy username"
                    className="h-7 w-7 p-0"
                    onClick={() => handleCopyToClipboard(credentials.username, 'username')}
                  >
                    {copiedField === 'username' ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Password</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-sm font-mono bg-transparent">
                    {showPassword ? credentials.password : '••••••••••••'}
                  </code>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="h-7 w-7 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Copy password"
                      className="h-7 w-7 p-0"
                      onClick={() => handleCopyToClipboard(credentials.password, 'password')}
                    >
                      {copiedField === 'password' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>Created: {new Date(credentials.createdAt).toLocaleString()}</p>
              {viewingSecret?.rotationPeriod && (
                <p>Rotation period: {formatRotationPeriod(viewingSecret.rotationPeriod)}</p>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowCredentialsModal(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No credentials available</p>
            <p className="text-xs">Click rotate to generate credentials</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                if (viewingSecret) handleRotate(viewingSecret);
              }}
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Generate Credentials
            </Button>
          </div>
        )}
      </Modal>

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={confirmDeleteSecret !== null}
        onClose={() => setConfirmDeleteSecret(null)}
        onConfirm={handleDeleteSecret}
        title="Delete Dynamic Secret"
        description={confirmDeleteSecret ? `"${confirmDeleteSecret.name}" and all its credentials will be permanently deleted.` : ''}
        confirmText="Delete"
        variant="danger"
      />
      <ConfirmModal
        isOpen={confirmDeleteJob !== null}
        onClose={() => setConfirmDeleteJob(null)}
        onConfirm={handleDeleteJob}
        title="Delete Rotation Job"
        description={confirmDeleteJob ? `"${confirmDeleteJob.name}" will be permanently deleted.` : ''}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

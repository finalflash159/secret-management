'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';

interface Environment {
  id: string;
  name: string;
  slug: string;
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  children: Folder[];
}

interface Secret {
  id: string;
  key: string;
  value: string;
  envId: string;
  folderId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  environment: Environment;
}

export default function ProjectSecretsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const slug = params.slug as string;

  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEnv, setActiveEnv] = useState<string>('');
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);
  const [showValue, setShowValue] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [secretKey, setSecretKey] = useState('');
  const [secretValue, setSecretValue] = useState('');
  const [folderName, setFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  useEffect(() => {
    if (activeEnv) {
      fetchSecrets();
    }
  }, [activeEnv]);

  const fetchProjectData = async () => {
    try {
      const [envsRes, foldersRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/environments`),
        fetch(`/api/projects/${projectId}/folders`),
      ]);

      if (envsRes.ok) {
        const envs = await envsRes.json();
        setEnvironments(envs);
        if (envs.length > 0 && !activeEnv) {
          setActiveEnv(envs[0].id);
        }
      }

      if (foldersRes.ok) {
        setFolders(await foldersRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch project data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSecrets = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/secrets?envId=${activeEnv}`);
      if (res.ok) {
        setSecrets(await res.json());
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
        body: JSON.stringify({ key: secretKey, value: secretValue, envId: activeEnv }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create secret');
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

  const handleUpdateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSecret) return;

    setError('');
    setCreating(true);

    try {
      const res = await fetch(`/api/secrets/${editingSecret.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: secretKey, value: secretValue }),
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
      if (res.ok) fetchSecrets();
    } catch (err) {
      console.error('Failed to delete:', err);
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

  const openEditModal = (secret: Secret) => {
    setEditingSecret(secret);
    setSecretKey(secret.key);
    setSecretValue(secret.value);
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
    if (s === 'prod' || s === 'production') return 'bg-[var(--color-prod)]';
    if (s === 'staging') return 'bg-[var(--color-staging)]';
    return 'bg-[var(--color-dev)]';
  };

  const filteredSecrets = secrets.filter(s => s.envId === activeEnv && s.key.toLowerCase().includes(searchQuery.toLowerCase()));
  const activeEnvData = environments.find(e => e.id === activeEnv);

  if (loading) {
    return (
      <div>
        <div className="h-7 w-28 bg-[var(--color-surface)] rounded animate-pulse mb-3" />
        <div className="h-56 bg-[var(--color-card)] rounded-lg border border-[var(--color-border)] animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/organizations/${slug}`} className="p-1 hover:bg-[var(--color-accent)] rounded-md transition-colors">
            <Image src="/icons/arrow-left.svg" alt="Back" width={14} height={14} className="text-[var(--color-muted-foreground)]" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-surface)]">
              <Image src="/icons/lock.svg" alt="Lock" width={14} height={14} className="text-[var(--color-muted-foreground)]" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-[var(--color-foreground)]">Secrets</h1>
              <p className="text-xs text-[var(--color-muted-foreground)]">{activeEnvData?.name}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setShowSettingsModal(true)}>
            <Image src="/icons/settings.svg" alt="Settings" width={14} height={14} />
          </Button>
          <Button size="sm" onClick={() => { setEditingSecret(null); setSecretKey(''); setSecretValue(''); setShowSecretModal(true); }}>
            <Image src="/icons/plus.svg" alt="Plus" width={14} height={14} className="mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Environment Tabs */}
      <div className="flex items-center gap-1 mb-3 p-1 bg-[var(--color-card)] rounded-lg border border-[var(--color-border)] w-fit">
        {environments.map((env) => (
          <button
            key={env.id}
            onClick={() => setActiveEnv(env.id)}
            className={`px-2.5 py-1 text-xs rounded-md transition-all flex items-center gap-1 ${
              activeEnv === env.id
                ? 'bg-[var(--color-primary)] text-[var(--color-surface)]'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${activeEnv === env.id ? 'bg-[var(--color-surface)]' : getEnvDot(env.slug)}`} />
            {env.name}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Image src="/icons/search.svg" alt="Search" width={14} height={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
        <input
          type="text"
          placeholder="Search secrets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] pl-8 pr-3 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
        />
      </div>

      {/* Secrets List */}
      {filteredSecrets.length === 0 ? (
        <Card className="border-dashed border-2 border-[var(--color-border)] bg-[var(--color-card)]/50">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-[var(--color-surface)]">
              <Image src="/icons/key.svg" alt="Key" width={16} height={16} className="text-[var(--color-muted-foreground)]" />
            </div>
            <h3 className="text-xs font-medium text-[var(--color-foreground)]">No secrets</h3>
            <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">Add your first secret</p>
            <Button size="sm" className="mt-3" onClick={() => { setEditingSecret(null); setShowSecretModal(true); }}>
              <Image src="/icons/plus.svg" alt="Plus" width={14} height={14} className="mr-1" />
              Add Secret
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-muted-foreground)]">Key</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-muted-foreground)]">Value</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-muted-foreground)] w-12">Ver</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-[var(--color-muted-foreground)] w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredSecrets.map((secret) => (
                  <tr key={secret.id} className="hover:bg-[var(--color-accent)]/50 transition-colors group">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Image src="/icons/key.svg" alt="Key" width={14} height={14} className="text-[var(--color-muted-foreground)]" />
                        <span className="font-mono text-xs text-[var(--color-foreground)]">{secret.key}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-[var(--color-muted-foreground)] max-w-xs truncate">
                          {visibleSecrets.has(secret.id) ? secret.value : '••••••••••••'}
                        </span>
                        <button onClick={() => toggleSecretVisibility(secret.id)} className="p-1 rounded hover:bg-[var(--color-accent)] opacity-0 group-hover:opacity-100 transition-opacity">
                          {visibleSecrets.has(secret.id) ? <Image src="/icons/eye-off.svg" alt="Hide" width={12} height={12} /> : <Image src="/icons/eye.svg" alt="Show" width={12} height={12} />}
                        </button>
                        <button onClick={() => copyToClipboard(secret)} className="p-1 rounded hover:bg-[var(--color-accent)] opacity-0 group-hover:opacity-100 transition-opacity">
                          {copiedSecret === secret.id ? <Image src="/icons/check.svg" alt="Check" width={12} height={12} className="text-[var(--color-success)]" /> : <Image src="/icons/copy.svg" alt="Copy" width={12} height={12} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] text-[var(--color-muted-foreground)]">v{secret.version}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(secret)} className="p-1 rounded hover:bg-[var(--color-accent)]">
                          <Image src="/icons/edit.svg" alt="Edit" width={12} height={12} />
                        </button>
                        <button onClick={() => handleDeleteSecret(secret.id)} className="p-1 rounded hover:bg-[var(--color-danger)]/10">
                          <Image src="/icons/trash.svg" alt="Delete" width={12} height={12} className="text-[var(--color-danger)]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Secret Modal */}
      <Modal isOpen={showSecretModal} onClose={() => { setShowSecretModal(false); setEditingSecret(null); setShowValue(false); }} title={editingSecret ? 'Edit Secret' : 'New Secret'}>
        <form onSubmit={editingSecret ? handleUpdateSecret : handleCreateSecret} className="space-y-3">
          {error && <div className="text-xs text-[var(--color-danger)]">{error}</div>}
          <div className="space-y-1.5">
            <Label htmlFor="key">Key</Label>
            <Input id="key" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="API_KEY" className="font-mono h-8" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="value">Value</Label>
            <div className="relative">
              <Input
                id="value"
                type={showValue ? "text" : "password"}
                value={secretValue}
                onChange={(e) => setSecretValue(e.target.value)}
                placeholder="secret value"
                className="font-mono h-8 pr-8"
                required
              />
              <button
                type="button"
                onClick={() => setShowValue(!showValue)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--accent)] rounded"
              >
                {showValue ? <Image src="/icons/eye-off.svg" alt="Hide" width={14} height={14} /> : <Image src="/icons/eye.svg" alt="Show" width={14} height={14} />}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-1.5 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => { setShowSecretModal(false); setEditingSecret(null); setShowValue(false); }}>Cancel</Button>
            <Button type="submit" disabled={creating} size="sm">{creating ? 'Saving...' : editingSecret ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Folder Modal */}
      <Modal isOpen={showFolderModal} onClose={() => { setShowFolderModal(false); setFolderName(''); }} title="New Folder">
        <form onSubmit={handleCreateFolder} className="space-y-3">
          {error && <div className="text-xs text-[var(--color-danger)]">{error}</div>}
          <div className="space-y-1.5">
            <Label htmlFor="folderName">Name</Label>
            <Input id="folderName" value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="production" className="h-8" required />
          </div>
          <div className="flex justify-end gap-1.5 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowFolderModal(false)}>Cancel</Button>
            <Button type="submit" disabled={creating} size="sm">{creating ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Settings Modal */}
      <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="Settings">
        <div className="space-y-2">
          <div className="flex items-center justify-between py-1.5">
            <div>
              <p className="text-xs font-medium text-[var(--color-foreground)]">Environments</p>
              <p className="text-[10px] text-[var(--color-muted-foreground)]">Manage environments</p>
            </div>
            <Button variant="outline" size="sm">Manage</Button>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <div>
              <p className="text-xs font-medium text-[var(--color-foreground)]">Team</p>
              <p className="text-[10px] text-[var(--color-muted-foreground)]">Manage members</p>
            </div>
            <Button variant="outline" size="sm"><Image src="/icons/users.svg" alt="Users" width={14} height={14} className="mr-1" />Manage</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

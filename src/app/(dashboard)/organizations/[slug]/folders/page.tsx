'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Folder, Pencil, Trash2, ChevronRight, ChevronDown, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

interface FolderData {
  id: string;
  name: string;
  parentId: string | null;
  envId: string;
  children: FolderData[];
  _count?: {
    secrets: number;
  };
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface Environment {
  id: string;
  name: string;
  slug: string;
}

export default function FoldersPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { addToast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userOrgRole, setUserOrgRole] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedEnv, setSelectedEnv] = useState<string>('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderData | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [folderName, setFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string>('');

  const fetchProjects = useCallback(async () => {
    try {
      const [orgRes, sessionRes] = await Promise.all([
        fetch(`/api/organizations/${slug}`),
        fetch('/api/auth/session'),
      ]);
      if (orgRes.ok) {
        const json = await orgRes.json();
        const data = json?.data ?? json;
        setProjects(data.projects || []);
        if (data.projects?.length > 0) {
          setSelectedProject(data.projects[0].id);
        }
      }
      if (sessionRes.ok) {
        const sessionJson = await sessionRes.json();
        const userId = sessionJson?.user?.id;
        if (userId && orgRes.ok) {
          const json = await orgRes.json();
          const data = json?.data ?? json;
          const myMembership = data?.members?.find(
            (m: { userId: string }) => m.userId === userId
          );
          setUserOrgRole(myMembership?.role ?? null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  }, [slug]);

  const fetchEnvironments = useCallback(async () => {
    if (!selectedProject) return;
    try {
      const res = await fetch(`/api/projects/${selectedProject}/environments`);
      if (res.ok) {
        const json = await res.json();
        const data = json?.data ?? json;
        setEnvironments(data || []);
        if (data?.length > 0) {
          setSelectedEnv(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch environments:', err);
    }
  }, [selectedProject]);

  const fetchFolders = useCallback(async () => {
    if (!selectedProject || !selectedEnv) {
      setFolders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject}/folders?envId=${selectedEnv}`);
      if (res.ok) {
        const json = await res.json();
        const data = json?.data ?? json;
        setFolders(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch folders:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProject, selectedEnv]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchEnvironments();
  }, [fetchEnvironments]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !selectedEnv) return;

    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderName,
          envId: selectedEnv,
          parentId: parentFolderId || null,
        }),
      });

      if (res.ok) {
        addToast({ title: 'Folder created', variant: 'success' });
        setShowCreateModal(false);
        setFolderName('');
        setParentFolderId('');
        fetchFolders();
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Failed to create folder', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleEditFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolder) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/folders/${editingFolder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderName }),
      });

      if (res.ok) {
        addToast({ title: 'Folder updated', variant: 'success' });
        setShowEditModal(false);
        setEditingFolder(null);
        setFolderName('');
        fetchFolders();
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Failed to update folder', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFolder = async (folder: FolderData) => {
    if (!confirm(`Are you sure you want to delete "${folder.name}"?`)) return;

    try {
      const res = await fetch(`/api/folders/${folder.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        addToast({ title: 'Folder deleted', variant: 'success' });
        fetchFolders();
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Failed to delete folder', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    }
  };

  const openEditModal = (folder: FolderData) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFolderName('');
    setParentFolderId('');
  };

  // Build folder tree from flat list
  const buildTree = (folders: FolderData[]): FolderData[] => {
    const map = new Map<string, FolderData>();
    const roots: FolderData[] = [];

    folders.forEach(f => map.set(f.id, { ...f, children: [] }));

    folders.forEach(f => {
      const folder = map.get(f.id)!;
      if (f.parentId && map.has(f.parentId)) {
        map.get(f.parentId)!.children.push(folder);
      } else {
        roots.push(folder);
      }
    });

    return roots;
  };

  const folderTree = buildTree(folders);

  const renderFolder = (folder: FolderData, level: number = 0) => {
    const hasChildren = folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);

    return (
      <div key={folder.id}>
        <div
          className="flex items-center gap-2 py-2.5 px-3 rounded-lg hover:bg-muted cursor-pointer group"
          style={{ paddingLeft: `${level * 24 + 12}px` }}
          onClick={() => hasChildren && toggleFolder(folder.id)}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
              className="p-1 hover:bg-muted-foreground/20 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="w-6" />
          )}
          <Folder className="h-5 w-5 text-muted-foreground" />
          <span className="text-base text-foreground flex-1 font-medium">{folder.name}</span>
          <span className="text-xs text-muted-foreground mr-2">
            {folder._count?.secrets || 0} secrets
          </span>
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => openEditModal(folder)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-danger"
              onClick={() => handleDeleteFolder(folder)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {hasChildren && isExpanded && folder.children.map(child => renderFolder(child, level + 1))}
      </div>
    );
  };

  // Get all folders (flattened) for parent selection
  const flattenFolders = (folders: FolderData[], level: number = 0): { id: string; name: string; level: number }[] => {
    let result: { id: string; name: string; level: number }[] = [];
    folders.forEach(f => {
      result.push({ id: f.id, name: f.name, level });
      if (f.children.length > 0) {
        result = result.concat(flattenFolders(f.children, level + 1));
      }
    });
    return result;
  };

  const flatFolders = flattenFolders(folderTree);

  if (!userOrgRole || userOrgRole === 'member') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center mb-4">
          <Shield className="h-6 w-6 text-danger" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          You need admin or owner role to manage folders.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Folders</h1>
          <p className="text-sm text-muted-foreground">Organize your secrets in folders</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} disabled={!selectedProject || !selectedEnv}>
          <Plus className="h-4 w-4 mr-2" />
          New Folder
        </Button>
      </div>

      {/* Project & Environment Selectors */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Label htmlFor="project">Project</Label>
          <select
            id="project"
            value={selectedProject}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              setSelectedEnv('');
              setFolders([]);
            }}
            className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            <option value="">Select project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
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
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          {!selectedProject || !selectedEnv ? (
            <div className="p-8 text-center text-muted-foreground">
              <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Select a project and environment to view folders</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : folderTree.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No folders yet</p>
              <p className="text-xs">Create a folder to organize your secrets</p>
            </div>
          ) : (
            <div className="space-y-0">
              {folderTree.map(folder => renderFolder(folder))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Folder Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); resetForm(); }} title="Create Folder">
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Folder Name</Label>
            <Input
              id="name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g., Database, API Keys"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="parent">Parent Folder (optional)</Label>
            <select
              id="parent"
              value={parentFolderId}
              onChange={(e) => setParentFolderId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <option value="">No parent (root)</option>
              {flatFolders.map(f => (
                <option key={f.id} value={f.id}>
                  {'—'.repeat(f.level)} {f.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { setShowCreateModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating} size="sm">
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Folder Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditingFolder(null); resetForm(); }} title="Edit Folder">
        <form onSubmit={handleEditFolder} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="editName">Folder Name</Label>
            <Input
              id="editName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { setShowEditModal(false); setEditingFolder(null); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} size="sm">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

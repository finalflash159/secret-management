'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Key, Folder, Plus, Pencil, Trash2, Loader2, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useToast } from '@/components/ui/toast';
import { normalizePermissionList } from '@/lib/permissions';

interface Role {
  id: string;
  name: string;
  slug: string;
  permissions: string[] | unknown[];
  isDefault: boolean;
  _count: {
    members: number;
  };
}

interface Project {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  members?: { userId: string }[];
  roles: Role[];
}

const allPermissions = [
  { name: 'secret:read', description: 'Read secrets' },
  { name: 'secret:write', description: 'Create and update secrets' },
  { name: 'secret:delete', description: 'Delete secrets' },
  { name: 'folder:manage', description: 'Create and manage folders' },
  { name: 'member:manage', description: 'Manage project members' },
  { name: 'settings:manage', description: 'Manage project settings' },
  { name: 'project:delete', description: 'Delete the project' },
];

const systemRoles = ['admin', 'developer', 'viewer'];

export default function AccessControlPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { addToast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [userOrgRole, setUserOrgRole] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteRole, setConfirmDeleteRole] = useState<Role | null>(null);

  // Form state
  const [roleName, setRoleName] = useState('');
  const [roleSlug, setRoleSlug] = useState('');
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [roleIsDefault, setRoleIsDefault] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const [orgRes, sessionRes] = await Promise.all([
        fetch(`/api/organizations/${slug}`),
        fetch('/api/auth/session'),
      ]);
      if (orgRes.ok && sessionRes.ok) {
        const orgJson = await orgRes.json();
        const orgData = orgJson?.data ?? orgJson;
        const sessionJson = await sessionRes.json();
        const currentUserId = sessionJson?.user?.id;
        const myMembership = orgData?.members?.find(
          (m: { userId: string }) => m.userId === currentUserId
        );
        setUserOrgRole(myMembership?.role ?? null);

        const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin';

        // Filter to only projects the user has access to
        const allProjects: Project[] = orgData?.projects ?? [];
        const accessibleProjects = isAdmin
          ? allProjects
          : allProjects.filter(
              (p) => p.ownerId === currentUserId || (p.members ?? []).some((m: { userId: string }) => m.userId === currentUserId)
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

  const fetchRoles = useCallback(async () => {
    if (!selectedProject) {
      setRoles([]);
      return;
    }

    setRolesLoading(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject}/roles`);
      if (res.ok) {
        const json = await res.json();
        const data = json?.data ?? json;
        setRoles(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    } finally {
      setRolesLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setRoleName(name);
    if (!editingRole) {
      setRoleSlug(generateSlug(name));
    }
  };

  const togglePermission = (perm: string) => {
    setRolePermissions(prev =>
      prev.includes(perm)
        ? prev.filter(p => p !== perm)
        : [...prev, perm]
    );
  };

  const resetForm = () => {
    setRoleName('');
    setRoleSlug('');
    setRolePermissions([]);
    setRoleIsDefault(false);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleSlug(role.slug);
    setRolePermissions(normalizePermissionList<string>(role.permissions));
    setRoleIsDefault(role.isDefault);
    setShowEditModal(true);
  };

  const getRolePermissions = (role: Role) =>
    normalizePermissionList<string>(role.permissions);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roleName,
          slug: roleSlug,
          permissions: rolePermissions,
          isDefault: roleIsDefault,
        }),
      });

      if (res.ok) {
        addToast({ title: 'Role created', variant: 'success' });
        setShowCreateModal(false);
        resetForm();
        fetchRoles();
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Failed to create role', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !selectedProject) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject}/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roleName,
          permissions: rolePermissions,
          isDefault: roleIsDefault,
        }),
      });

      if (res.ok) {
        addToast({ title: 'Role updated', variant: 'success' });
        setShowEditModal(false);
        setEditingRole(null);
        resetForm();
        fetchRoles();
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Failed to update role', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!confirmDeleteRole || !selectedProject) return;

    try {
      const res = await fetch(`/api/projects/${selectedProject}/roles/${confirmDeleteRole.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        addToast({ title: 'Role deleted', variant: 'success' });
        fetchRoles();
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Failed to delete role', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    } finally {
      setConfirmDeleteRole(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Non-admin/member users cannot access access control
  if (!userOrgRole || userOrgRole === 'member') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center mb-4">
          <Shield className="h-6 w-6 text-danger" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          You need admin or owner role to manage access control.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Access Control</h1>
          <p className="text-sm text-muted-foreground">Manage roles and permissions for your projects</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} disabled={!selectedProject}>
          <Plus className="h-4 w-4 mr-2" />
          New Role
        </Button>
      </div>

      {/* Project Selector */}
      {projects.length > 0 && (
        <div className="flex gap-4">
          <div className="flex-1 max-w-xs">
            <Label htmlFor="project">Project</Label>
            <select
              id="project"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <option value="">Select project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Permissions Reference */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-muted">
              <Key className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Available Permissions</h3>
              <p className="text-xs text-muted-foreground">Permission types available across all projects</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {allPermissions.map((perm) => (
              <div key={perm.name} className="py-2 px-3 rounded-lg bg-muted/50">
                <code className="text-xs text-foreground font-mono">{perm.name}</code>
                <p className="text-xs text-muted-foreground">{perm.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Project Roles */}
      {!selectedProject ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">Select a project to manage roles</p>
          </CardContent>
        </Card>
      ) : rolesLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : roles.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Folder className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-base font-medium text-foreground">No custom roles yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Create a role to manage access for this project.</p>
            <Button className="mt-4" size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Role
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {roles.map((role) => {
            const isSystem = systemRoles.includes(role.slug);
            return (
              <Card key={role.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Shield className="h-4 w-4 text-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{role.name}</span>
                          {isSystem && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              System
                            </span>
                          )}
                          {role.isDefault && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {role._count?.members || 0} members
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono mr-2">
                        {role.slug}
                      </span>
                      {!isSystem && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Edit role ${role.name}`}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditModal(role)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Delete role ${role.name}`}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-danger"
                            onClick={() => setConfirmDeleteRole(role)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  {getRolePermissions(role).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {getRolePermissions(role).map((perm) => (
                        <span
                          key={perm}
                          className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Role Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); resetForm(); }} title="Create Role">
        <form onSubmit={handleCreateRole} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Role Name</Label>
            <Input
              id="name"
              value={roleName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., QA Engineer"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={roleSlug}
              onChange={(e) => setRoleSlug(e.target.value)}
              placeholder="qa-engineer"
              aria-describedby="role-slug-help"
              required
            />
            <p id="role-slug-help" className="text-xs text-muted-foreground">URL-friendly identifier (lowercase, no spaces)</p>
          </div>
          <div className="space-y-1.5">
            <Label>Permissions</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {allPermissions.map((perm) => (
                <label
                  key={perm.name}
                  className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted p-1.5 rounded"
                >
                  <input
                    type="checkbox"
                    checked={rolePermissions.includes(perm.name)}
                    onChange={() => togglePermission(perm.name)}
                    className="rounded border-border"
                  />
                  <span className="font-mono text-foreground">{perm.name}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={roleIsDefault}
              onChange={(e) => setRoleIsDefault(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-foreground">Set as default role</span>
          </label>
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

      {/* Edit Role Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditingRole(null); resetForm(); }} title="Edit Role">
        <form onSubmit={handleUpdateRole} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="editName">Role Name</Label>
            <Input
              id="editName"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="editSlug">Slug</Label>
            <Input
              id="editSlug"
              value={roleSlug}
              disabled
              aria-describedby="edit-role-slug-help"
              className="bg-muted"
            />
            <p id="edit-role-slug-help" className="text-xs text-muted-foreground">Slug cannot be changed</p>
          </div>
          <div className="space-y-1.5">
            <Label>Permissions</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {allPermissions.map((perm) => (
                <label
                  key={perm.name}
                  className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted p-1.5 rounded"
                >
                  <input
                    type="checkbox"
                    checked={rolePermissions.includes(perm.name)}
                    onChange={() => togglePermission(perm.name)}
                    className="rounded border-border"
                  />
                  <span className="font-mono text-foreground">{perm.name}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={roleIsDefault}
              onChange={(e) => setRoleIsDefault(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-foreground">Set as default role</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { setShowEditModal(false); setEditingRole(null); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} size="sm">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmDeleteRole}
        onClose={() => setConfirmDeleteRole(null)}
        onConfirm={handleDeleteRole}
        title={`Delete "${confirmDeleteRole?.name}"?`}
        description="Members with this role will lose their assigned permissions."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Folder, Key, Server, Plus, ArrowRight, Shield } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  environments: { id: string; name: string; slug: string }[];
  _count: {
    secrets: number;
    folders: number;
  };
  members?: { userId: string }[];
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  projects: Project[];
  members?: { userId: string; role: string }[];
}

export default function OrganizationProjectsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userOrgRole, setUserOrgRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectSlug, setNewProjectSlug] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrganization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const fetchOrganization = async () => {
    try {
      const [orgRes, sessionRes] = await Promise.all([
        fetch(`/api/organizations/${slug}`),
        fetch('/api/auth/session'),
      ]);
      if (orgRes.ok) {
        const json = await orgRes.json();
        const data = json?.data ?? json;
        setOrganization(data);
        if (sessionRes.ok) {
          const sessionJson = await sessionRes.json();
          const uid = sessionJson?.user?.id;
          setUserId(uid);
          const myMembership = data?.members?.find(
            (m: { userId: string }) => m.userId === uid
          );
          setUserOrgRole(myMembership?.role ?? null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch organization:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName, slug: newProjectSlug, orgId: organization?.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create project');
        return;
      }

      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectSlug('');
      fetchOrganization();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setNewProjectName(name);
    setNewProjectSlug(generateSlug(name));
  };

  const getEnvBadgeVariant = (envSlug: string) => {
    const s = envSlug.toLowerCase();
    if (s === 'prod' || s === 'production') return 'env-prod';
    if (s === 'staging') return 'env-staging';
    if (s === 'dev' || s === 'development') return 'env-dev';
    return 'env-test';
  };

  // Member chỉ thấy projects mà họ có quyền truy cập
  const isAdmin = userOrgRole === 'owner' || userOrgRole === 'admin';
  const visibleProjects = isAdmin
    ? organization?.projects ?? []
    : (organization?.projects ?? []).filter(
        (p) => p.ownerId === userId || (p.members ?? []).some((m) => m.userId === userId)
      );
  const hasNoProject = visibleProjects.length === 0;
  const totalSecrets = visibleProjects.reduce((sum, p) => sum + (p._count?.secrets ?? 0), 0) ?? 0;
  const totalEnvs = visibleProjects.reduce((sum, p) => sum + (p.environments?.length ?? 0), 0) ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-muted-foreground">Organization not found</div>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/organizations"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          Back
        </Link>
      </div>

      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface">
            <Folder className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">{organization.name}</h1>
            <p className="text-xs text-muted-foreground">Projects & secrets</p>
          </div>
        </div>
        {(userOrgRole === 'owner' || userOrgRole === 'admin') && (
          <Button onClick={() => setShowCreateModal(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            New Project
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-2.5 md:grid-cols-3 mb-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Projects</p>
              <p className="text-xl font-extrabold text-foreground">{visibleProjects.length}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface">
              <Folder className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Secrets</p>
              <p className="text-xl font-extrabold text-foreground">{totalSecrets}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface">
              <Key className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Envs</p>
              <p className="text-xl font-extrabold text-foreground">{totalEnvs}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface">
              <Server className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* Projects */}
      {hasNoProject && userOrgRole === 'member' ? (
        <Card className="border-dashed border-2 border-border bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-surface">
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Chưa có project nào</h3>
            <p className="mt-1 text-center text-xs text-muted-foreground max-w-xs">
              Bạn chưa được thêm vào project nào. Liên hệ admin để được cấp quyền truy cập project.
            </p>
          </CardContent>
        </Card>
      ) : !visibleProjects || visibleProjects.length === 0 ? (
        <Card className="border-dashed border-2 border-border bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-surface">
              <Folder className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No projects</h3>
            <p className="mt-1 text-center text-xs text-muted-foreground max-w-xs">
              Create your first project to manage secrets
            </p>
            <Button className="mt-3" size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((project) => (
            <Link key={project.id} href={`/organizations/${slug}/projects/${project.id}`}>
              <Card className="cursor-pointer bg-card border-border hover:border-border-hover transition-all group">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface">
                      <Key className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="mt-2.5">
                    <CardTitle className="text-sm text-foreground">{project.name}</CardTitle>
                    <CardDescription className="text-xs">/{project.slug}</CardDescription>
                  </div>

                  {/* Environment badges */}
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {project.environments.map((env) => (
                      <Badge key={env.id} variant={getEnvBadgeVariant(env.slug)}>
                        {env.name}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Server className="h-3 w-3" />
                      {project.environments.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <Key className="h-3 w-3" />
                      {project._count.secrets}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Project">
        <form onSubmit={handleCreateProject} className="space-y-4">
          {error && (
            <div className="rounded-md bg-danger/10 p-2.5 text-sm text-danger border border-danger/20">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={newProjectName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My App"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={newProjectSlug}
              onChange={(e) => setNewProjectSlug(e.target.value)}
              placeholder="my-app"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating} size="sm">
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

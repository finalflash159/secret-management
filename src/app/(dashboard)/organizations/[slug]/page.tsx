'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';

interface Project {
  id: string;
  name: string;
  slug: string;
  environments: { id: string; name: string; slug: string }[];
  _count: {
    secrets: number;
    folders: number;
  };
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  projects: Project[];
}

export default function OrganizationProjectsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectSlug, setNewProjectSlug] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrganization();
  }, [slug]);

  const fetchOrganization = async () => {
    try {
      const res = await fetch(`/api/organizations/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setOrganization(data);
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

  const getEnvBadgeClass = (envSlug: string) => {
    const slug = envSlug.toLowerCase();
    if (slug === 'prod' || slug === 'production') return 'env-prod';
    if (slug === 'staging') return 'env-staging';
    return 'env-dev';
  };

  const totalSecrets = organization?.projects.reduce((sum, p) => sum + p._count.secrets, 0) || 0;
  const totalEnvs = organization?.projects.reduce((sum, p) => p.environments.length, 0) || 0;

  if (loading) {
    return (
      <div>
        <div className="mb-4">
          <div className="h-5 w-24 bg-[var(--color-surface)] rounded animate-pulse mb-2" />
          <div className="h-8 w-48 bg-[var(--color-surface)] rounded animate-pulse" />
        </div>
        <div className="grid gap-2.5 md:grid-cols-3 mb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[var(--color-card)] rounded-lg border border-[var(--color-border)] p-3 animate-pulse" />
          ))}
        </div>
        <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-[var(--color-card)] rounded-lg border border-[var(--color-border)] p-4 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-[var(--color-muted-foreground)]">Organization not found</div>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/organizations"
          className="inline-flex items-center text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <Image src="/icons/arrow-left.svg" alt="Back" width={14} height={14} className="mr-1" />
          Back
        </Link>
      </div>

      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--color-surface)]">
            <Image src="/icons/folder.svg" alt="Folder" width={16} height={16} className="text-[var(--color-muted-foreground)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-foreground)]">{organization.name}</h1>
            <p className="text-xs text-[var(--color-muted-foreground)]">Projects & secrets</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="sm">
          <Image src="/icons/plus.svg" alt="Plus" width={14} height={14} className="mr-1.5" />
          New Project
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-2.5 md:grid-cols-3 mb-4">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--color-muted-foreground)]">Projects</p>
              <p className="text-xl font-semibold text-[var(--color-foreground)]">{organization.projects.length}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-surface)]">
              <Image src="/icons/folder.svg" alt="Folder" width={16} height={16} className="text-[var(--color-muted-foreground)]" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--color-muted-foreground)]">Secrets</p>
              <p className="text-xl font-semibold text-[var(--color-foreground)]">{totalSecrets}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-surface)]">
              <Image src="/icons/key.svg" alt="Key" width={16} height={16} className="text-[var(--color-muted-foreground)]" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--color-muted-foreground)]">Envs</p>
              <p className="text-xl font-semibold text-[var(--color-foreground)]">{totalEnvs}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-surface)]">
              <Image src="/icons/server.svg" alt="Server" width={16} height={16} className="text-[var(--color-muted-foreground)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Projects */}
      {!organization.projects || organization.projects.length === 0 ? (
        <Card className="border-dashed border-2 border-[var(--color-border)] bg-[var(--color-card)]/50">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-surface)]">
              <Image src="/icons/folder.svg" alt="Folder" width={20} height={20} className="text-[var(--color-muted-foreground)]" />
            </div>
            <h3 className="text-sm font-medium text-[var(--color-foreground)]">No projects</h3>
            <p className="mt-1 text-center text-xs text-[var(--color-muted-foreground)] max-w-xs">
              Create your first project to manage secrets
            </p>
            <Button className="mt-3" size="sm" onClick={() => setShowCreateModal(true)}>
              <Image src="/icons/plus.svg" alt="Plus" width={14} height={14} className="mr-1.5" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
          {organization.projects.map((project) => (
            <Link key={project.id} href={`/organizations/${slug}/projects/${project.id}`}>
              <Card className="cursor-pointer bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-all group">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-surface)]">
                      <Image src="/icons/key.svg" alt="Key" width={16} height={16} className="text-[var(--color-muted-foreground)]" />
                    </div>
                    <Image src="/icons/arrow-right.svg" alt="Arrow" width={14} height={14} className="text-[var(--color-muted-foreground)] transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="mt-2.5">
                    <CardTitle className="text-sm text-[var(--color-foreground)]">{project.name}</CardTitle>
                    <CardDescription className="text-xs">/{project.slug}</CardDescription>
                  </div>

                  {/* Environment badges */}
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {project.environments.map((env) => (
                      <span
                        key={env.id}
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border badge-${getEnvBadgeClass(env.slug)}`}
                      >
                        {env.name}
                      </span>
                    ))}
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
                    <span className="flex items-center gap-1">
                      <Image src="/icons/server.svg" alt="Server" width={12} height={12} />
                      {project.environments.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <Image src="/icons/key.svg" alt="Key" width={12} height={12} />
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
            <div className="rounded-md bg-[var(--color-danger)]/10 p-2.5 text-sm text-[var(--color-danger)] border border-[var(--color-danger)]/20">
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

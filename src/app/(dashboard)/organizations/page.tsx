'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Avatar } from '@/components/ui/avatar';

interface Organization {
  id: string;
  name: string;
  slug: string;
  avatar?: string | null;
  _count: {
    projects: number;
    members: number;
  };
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/organizations');
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newOrgName, slug: newOrgSlug }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create organization');
        return;
      }

      setShowCreateModal(false);
      setNewOrgName('');
      setNewOrgSlug('');
      fetchOrganizations();
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
    setNewOrgName(name);
    setNewOrgSlug(generateSlug(name));
  };

  const totalProjects = organizations.reduce((sum, org) => sum + org._count.projects, 0);
  const totalMembers = organizations.reduce((sum, org) => sum + org._count.members, 0);

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <div className="h-8 w-40 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-56 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid gap-3 md:grid-cols-3 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-card rounded-lg border border-border p-4 animate-pulse" />
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-card rounded-lg border border-border p-4 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">Organizations</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage your teams and projects</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} size="sm">
            <Image src="/icons/plus.svg" alt="Plus" width={14} height={14} className="mr-1.5" />
            New Organization
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-3 mb-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total</p>
              <p className="text-2xl font-extrabold text-foreground mt-0.5">{organizations.length}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <Image src="/icons/layout-grid.svg" alt="Grid" width={16} height={16} className="text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Projects</p>
              <p className="text-2xl font-extrabold text-foreground mt-0.5">{totalProjects}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <Image src="/icons/folder.svg" alt="Folder" width={16} height={16} className="text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Members</p>
              <p className="text-2xl font-extrabold text-foreground mt-0.5">{totalMembers}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <Image src="/icons/users.svg" alt="Users" width={16} height={16} className="text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {organizations.length === 0 ? (
        <Card className="border-dashed border-2 border-border bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Image src="/icons/building.svg" alt="Building" width={24} height={24} className="text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No organizations</h3>
            <p className="mt-1 text-center text-xs text-muted-foreground max-w-xs">
              Create your first organization to get started
            </p>
            <Button className="mt-4" size="sm" onClick={() => setShowCreateModal(true)}>
              <Image src="/icons/plus.svg" alt="Plus" width={14} height={14} className="mr-1.5" />
              Create Organization
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Link key={org.id} href={`/organizations/${org.slug}`}>
              <Card className="cursor-pointer bg-card border-border hover:border-border-hover transition-all group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Avatar src={org.avatar} fallback={org.name.charAt(0).toUpperCase()} size="md" />
                    <Image src="/icons/arrow-right.svg" alt="Arrow" width={14} height={14} className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{org.name}</h3>
                  <p className="text-xs text-muted-foreground">/{org.slug}</p>

                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Image src="/icons/folder.svg" alt="Folder" width={12} height={12} />
                      {org._count.projects}
                    </span>
                    <span className="flex items-center gap-1">
                      <Image src="/icons/users.svg" alt="Users" width={12} height={12} />
                      {org._count.members}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Organization">
        <form onSubmit={handleCreateOrg} className="space-y-4">
          {error && (
            <div className="rounded-md bg-danger/10 p-2.5 text-sm text-danger border border-danger/20">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={newOrgName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Corp"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={newOrgSlug}
              onChange={(e) => setNewOrgSlug(e.target.value)}
              placeholder="acme-corp"
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

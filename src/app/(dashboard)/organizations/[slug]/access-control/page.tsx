'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Key, Folder, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Role {
  id: string;
  name: string;
  slug: string;
  permissions: string[];
  isDefault: boolean;
  _count: {
    members: number;
  };
}

interface Project {
  id: string;
  name: string;
  slug: string;
  roles: Role[];
}

export default function AccessControlPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${slug}`);
      if (res.ok) {
        const json = await res.json();
        const data = json?.data ?? json;
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const allPermissions = [
    { name: 'secret:read', description: 'Read secrets' },
    { name: 'secret:write', description: 'Create and update secrets' },
    { name: 'secret:delete', description: 'Delete secrets' },
    { name: 'folder:manage', description: 'Create and manage folders' },
    { name: 'member:manage', description: 'Manage project members' },
    { name: 'settings:manage', description: 'Manage project settings' },
    { name: 'project:delete', description: 'Delete the project' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Access Control</h1>
        <p className="text-sm text-muted-foreground">Manage roles and permissions for your projects</p>
      </div>

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
                <p className="text-[10px] text-muted-foreground">{perm.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Project Roles */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Project Roles</h2>
        {projects.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <Folder className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">No projects yet</p>
              <p className="text-xs text-muted-foreground">Create a project to manage roles</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <Card key={project.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium text-foreground">{project.name}</h3>
                    </div>
                    <Link href={`/organizations/${slug}/projects/${project.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                  {project.roles && project.roles.length > 0 ? (
                    <div className="space-y-2">
                      {project.roles.map((role) => (
                        <div key={role.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                          <div>
                            <span className="text-sm text-foreground">{role.name}</span>
                            {role.isDefault && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                Default
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {role._count?.members || 0} members
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No custom roles</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

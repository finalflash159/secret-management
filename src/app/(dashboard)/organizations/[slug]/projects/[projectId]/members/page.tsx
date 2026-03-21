'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Users, Plus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useToast } from '@/components/ui/toast';

interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  roleId: string;
  role: {
    id: string;
    name: string;
    slug: string;
    permissions: string[];
    isDefault: boolean;
  };
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export default function ProjectMembersPage() {
  const params = useParams();
  const slug = params.slug as string;
  const projectId = params.projectId as string;
  const { addToast } = useToast();

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [userOrgRole, setUserOrgRole] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRoleId, setAddRoleId] = useState('');
  const [availableRoles, setAvailableRoles] = useState<{ id: string; name: string }[]>([]);
  const [adding, setAdding] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [projectRes, sessionRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch('/api/auth/session'),
      ]);

      if (projectRes.ok) {
        const json = await projectRes.json();
        const data = json?.data ?? json;
        setProjectName(data?.name ?? '');
        setMembers(data?.members ?? []);

        // Get roles for the add member dropdown
        if (data?.roles?.length > 0) {
          setAvailableRoles(data.roles.filter((r: { isDefault: boolean }) => r.isDefault));
        }
      }

      if (sessionRes.ok) {
        const sessionJson = await sessionRes.json();
        const uid = sessionJson?.user?.id;
        const orgRes = await fetch(`/api/organizations/${slug}`);
        if (orgRes.ok) {
          const orgJson = await orgRes.json();
          const orgData = orgJson?.data ?? orgJson;
          const myMembership = orgData?.members?.find(
            (m: { userId: string }) => m.userId === uid
          );
          setUserOrgRole(myMembership?.role ?? null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch project members:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail || !addRoleId) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addEmail, roleId: addRoleId }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast({ title: 'Member added to project', variant: 'success' });
        setShowAddModal(false);
        setAddEmail('');
        setAddRoleId('');
        fetchData();
      } else {
        addToast({ title: data.error || 'Failed to add member', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!confirmRemove) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${confirmRemove.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        addToast({ title: 'Member removed from project', variant: 'success' });
        fetchData();
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Failed to remove member', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    } finally {
      setConfirmRemove(null);
    }
  };

  const getRoleColor = (roleSlug: string) => {
    switch (roleSlug) {
      case 'admin':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'developer':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'viewer':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const isAdmin = userOrgRole === 'owner' || userOrgRole === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Project Members</h1>
          <p className="text-sm text-muted-foreground">Manage members in {projectName || 'this project'}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        )}
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No members in this project</p>
              {isAdmin && (
                <p className="text-xs mt-1">Click &quot;Add Member&quot; to add team members to this project.</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {member.user.name?.charAt(0).toUpperCase() || member.user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {member.user.name || 'Unnamed User'}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full border ${getRoleColor(member.role.slug)}`}>
                      {member.role.name}
                    </span>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmRemove({ id: member.id, name: member.user.name || member.user.email })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setAddEmail(''); setAddRoleId(''); }} title="Add Member to Project">
        <form onSubmit={handleAddMember} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add an organization member to this project. They must already be a member of the organization.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="member@example.com"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              value={addRoleId}
              onChange={(e) => setAddRoleId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              required
            >
              <option value="">Select role</option>
              {availableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={adding || !addEmail || !addRoleId} size="sm">
              {adding ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={handleRemoveMember}
        title={`Remove &quot;${confirmRemove?.name}&quot; from project?`}
        description="They will lose access to this project's secrets."
        confirmText="Remove"
        variant="danger"
      />
    </div>
  );
}

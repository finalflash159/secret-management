'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Copy, RefreshCw, Trash2, Plus, Loader2, Link, Mail, Clock, CheckCircle, XCircle, Users, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useToast } from '@/components/ui/toast';

interface Invitation {
  id: string;
  code: string;
  email: string | null;
  role: string;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isRevoked: boolean;
  createdAt: string;
  createdBy: string;
  uses: {
    id: string;
    userId: string;
    usedAt: string;
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  }[];
}

interface Stats {
  total: number;
  active: number;
  used: number;
  expired: number;
  revoked: number;
}

export default function InvitationsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { addToast } = useToast();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, used: 0, expired: 0, revoked: 0 });
  const [loading, setLoading] = useState(true);
  const [userOrgRole, setUserOrgRole] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Confirm modals
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState<string | null>(null);

  // Form state
  const [formRole, setFormRole] = useState<'admin' | 'member'>('member');
  const [formEmail, setFormEmail] = useState('');
  const [formMaxUses, setFormMaxUses] = useState<number>(1);
  const [formExpiresInDays, setFormExpiresInDays] = useState<number>(30);

  const fetchInvitations = useCallback(async () => {
    try {
      const [invRes, orgRes, sessionRes] = await Promise.all([
        fetch(`/api/organizations/${slug}/invitations`),
        fetch(`/api/organizations/${slug}`),
        fetch('/api/auth/session'),
      ]);
      if (invRes.ok) {
        const json = await invRes.json();
        const data = json?.data ?? json;
        setInvitations(data.invitations || []);
        setStats(data.stats || { total: 0, active: 0, used: 0, expired: 0, revoked: 0 });
      }
      // Always determine role when session exists
      if (sessionRes.ok) {
        const sessionJson = await sessionRes.json();
        const userId = sessionJson?.user?.id;
        if (userId) {
          if (orgRes.ok) {
            const orgJson = await orgRes.json();
            const orgData = orgJson?.data ?? orgJson;
            const myMembership = orgData?.members?.find(
              (m: { userId: string }) => m.userId === userId
            );
            setUserOrgRole(myMembership?.role ?? null);
          } else {
            setUserOrgRole(null);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch(`/api/organizations/${slug}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: formRole,
          email: formEmail || null,
          maxUses: formMaxUses,
          expiresInDays: formExpiresInDays,
        }),
      });

      if (res.ok) {
        addToast({ title: 'Invitation created', variant: 'success' });
        setShowCreateModal(false);
        resetForm();
        fetchInvitations();
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Failed to create invitation', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    const id = confirmRevoke;
    if (!id) return;
    try {
      const res = await fetch(`/api/organizations/${slug}/invitations/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        addToast({ title: 'Invitation revoked', variant: 'success' });
        fetchInvitations();
        setConfirmRevoke(null);
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Failed to revoke', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    }
  };

  const handleRegenerate = async () => {
    const id = confirmRegenerate;
    if (!id) return;
    try {
      const res = await fetch(`/api/organizations/${slug}/invitations/${id}/regenerate`, {
        method: 'POST',
      });

      if (res.ok) {
        addToast({ title: 'Code regenerated', variant: 'success' });
        fetchInvitations();
        setConfirmRegenerate(null);
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Failed to regenerate', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    addToast({ title: 'Code copied to clipboard', variant: 'success' });
  };

  const copyInviteLink = (code: string) => {
    const link = `${window.location.origin}/register?code=${code}`;
    navigator.clipboard.writeText(link);
    addToast({ title: 'Invite link copied', variant: 'success' });
  };

  const resetForm = () => {
    setFormRole('member');
    setFormEmail('');
    setFormMaxUses(1);
    setFormExpiresInDays(30);
  };

  const getStatusBadge = (invitation: Invitation) => {
    const now = new Date();
    const isExpired = invitation.expiresAt && new Date(invitation.expiresAt) < now;
    const isMaxed = invitation.maxUses && invitation.usedCount >= invitation.maxUses;

    if (invitation.isRevoked) {
      return { label: 'Revoked', class: 'bg-red-500/10 text-red-500 border-red-500/20', icon: XCircle };
    }
    if (isExpired) {
      return { label: 'Expired', class: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock };
    }
    if (isMaxed) {
      return { label: 'Max Used', class: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: Users };
    }
    return { label: 'Active', class: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userOrgRole || userOrgRole === 'member') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center mb-4">
          <Shield className="h-6 w-6 text-danger" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          You need admin or owner role to manage invitations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Invitations</h1>
          <p className="text-sm text-muted-foreground">Manage invitation codes for your organization</p>
        </div>
        {(userOrgRole === 'owner' || userOrgRole === 'admin') && (
          <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Invitation
        </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-500">{stats.active}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-500">{stats.used}</div>
            <div className="text-xs text-muted-foreground">Used</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-500">{stats.expired}</div>
            <div className="text-xs text-muted-foreground">Expired</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-500">{stats.revoked}</div>
            <div className="text-xs text-muted-foreground">Revoked</div>
          </CardContent>
        </Card>
      </div>

      {/* Invitations List */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {invitations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No invitations yet</p>
              <p className="text-xs">Create an invitation to invite members</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {invitations.map((invitation) => {
                const status = getStatusBadge(invitation);
                const StatusIcon = status.icon;

                return (
                  <div key={invitation.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="font-mono text-sm font-medium text-foreground bg-muted px-2 py-1 rounded">
                        {invitation.code}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${status.class} flex items-center gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {invitation.role}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {invitation.email ? (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {invitation.email}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Link className="h-3 w-3" />
                              Any email
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-xs text-muted-foreground text-right">
                        <div>
                          {invitation.maxUses
                            ? `${invitation.usedCount} / ${invitation.maxUses} uses`
                            : `${invitation.usedCount} uses`}
                        </div>
                        {invitation.expiresAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(invitation.code)}
                          title="Copy code"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteLink(invitation.code)}
                          title="Copy invite link"
                        >
                          <Link className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmRegenerate(invitation.id)}
                          title="Regenerate code"
                          disabled={invitation.isRevoked}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmRevoke(invitation.id)}
                          title="Revoke"
                          disabled={invitation.isRevoked}
                          className="text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Invitation Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); resetForm(); }} title="Create Invitation">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              value={formRole}
              onChange={(e) => setFormRole(e.target.value as 'admin' | 'member')}
              className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="Restrict to specific email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Leave empty to allow any email address</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maxUses">Max uses</Label>
            <select
              id="maxUses"
              value={formMaxUses ?? 1}
              onChange={(e) => setFormMaxUses(e.target.value ? parseInt(e.target.value) : 1)}
              className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <option value="1">1 use</option>
              <option value="5">5 uses</option>
              <option value="10">10 uses</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expiresInDays">Expires</Label>
            <select
              id="expiresInDays"
              value={formExpiresInDays ?? 30}
              onChange={(e) => setFormExpiresInDays(e.target.value ? parseInt(e.target.value) : 30)}
              className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { setShowCreateModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating} size="sm">
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Invitation'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={confirmRevoke !== null}
        onClose={() => setConfirmRevoke(null)}
        onConfirm={handleRevoke}
        title="Revoke Invitation"
        description="This invitation code will no longer work. This action cannot be undone."
        confirmText="Revoke"
        variant="danger"
      />
      <ConfirmModal
        isOpen={confirmRegenerate !== null}
        onClose={() => setConfirmRegenerate(null)}
        onConfirm={handleRegenerate}
        title="Regenerate Code"
        description="A new code will be generated. The old code will stop working immediately."
        confirmText="Regenerate"
        variant="default"
      />
    </div>
  );
}

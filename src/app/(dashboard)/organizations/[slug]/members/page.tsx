'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Users, Plus, Mail, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';

interface Member {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
  };
}

export default function MembersPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteType, setInviteType] = useState<'email' | 'code'>('email');
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  // Invite code options
  const [codeEmail, setCodeEmail] = useState('');
  const [codeMaxUses, setCodeMaxUses] = useState<number>(1);
  const [codeExpiresInDays, setCodeExpiresInDays] = useState<number>(30);
  const [error, setError] = useState('');
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${slug}/members`);
      if (res.ok) {
        const json = await res.json();
        setMembers(json?.data ?? json);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInviting(true);

    try {
      if (inviteType === 'code') {
        // Create invitation code
        const res = await fetch(`/api/organizations/${slug}/invitations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: inviteRole,
            email: codeEmail || null,
            maxUses: codeMaxUses,
            expiresInDays: codeExpiresInDays,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to create invitation code');
          return;
        }

        const code = data.data?.code || '';
        const inviteLink = `${window.location.origin}/register?code=${code}`;
        setShowInviteModal(false);
        setInviteRole('member');
        setCodeEmail('');
        setCodeMaxUses(1);
        setCodeExpiresInDays(30);
        alert(`Invitation code created!\n\nCode: ${code}\nLink: ${inviteLink}`);
      } else {
        // Invite by email (existing user)
        const res = await fetch(`/api/organizations/${slug}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to invite member');
          return;
        }

        setShowInviteModal(false);
        setInviteEmail('');
        setInviteRole('member');
        fetchMembers();
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName || 'this member'}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/organizations/${slug}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchMembers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove member');
      }
    } catch {
      alert('An error occurred. Please try again.');
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: 'admin' | 'member') => {
    setUpdatingMemberId(memberId);
    try {
      const res = await fetch(`/api/organizations/${slug}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        fetchMembers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update role');
      }
    } catch {
      alert('An error occurred. Please try again.');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'admin':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

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
          <h1 className="text-xl font-bold text-foreground">Members</h1>
          <p className="text-sm text-muted-foreground">Manage team members and their access</p>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No members yet</p>
              <p className="text-xs">Invite members to collaborate</p>
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
                    {member.role === 'owner' ? (
                      <span className={`text-xs px-2 py-1 rounded-full border ${getRoleBadgeVariant(member.role)}`}>
                        Owner
                      </span>
                    ) : (
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.id, e.target.value as 'admin' | 'member')}
                        disabled={updatingMemberId === member.id}
                        className="text-xs px-2 py-1 rounded-md border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id, member.user.name || member.user.email)}
                      disabled={member.role === 'owner'}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setInviteEmail('');
          setInviteRole('member');
          setCodeEmail('');
          setCodeMaxUses(1);
          setCodeExpiresInDays(30);
          setError('');
        }}
        title="Invite Member"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          {/* Tab Switcher */}
          <div className="flex border-b border-border mb-4">
            <button
              type="button"
              onClick={() => setInviteType('email')}
              className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                inviteType === 'email'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Invite by Email
            </button>
            <button
              type="button"
              onClick={() => setInviteType('code')}
              className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                inviteType === 'code'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Create Invitation Code
            </button>
          </div>

          {error && (
            <div className="rounded-md bg-danger/10 p-2.5 text-sm text-danger border border-danger/20">
              {error}
            </div>
          )}

          {inviteType === 'email' ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                <p>Create an invitation code that you can share with anyone. They will be able to register and join this organization with the selected role.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="codeRole">Role</Label>
                <select
                  id="codeRole"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="codeEmail">Email (optional)</Label>
                <Input
                  id="codeEmail"
                  type="email"
                  placeholder="Restrict to specific email"
                  value={codeEmail}
                  onChange={(e) => setCodeEmail(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">Leave empty to allow any email address</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="codeMaxUses">Max uses</Label>
                <select
                  id="codeMaxUses"
                  value={codeMaxUses}
                  onChange={(e) => setCodeMaxUses(parseInt(e.target.value))}
                  className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <option value="1">1 use</option>
                  <option value="5">5 uses</option>
                  <option value="10">10 uses</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="codeExpires">Expires</Label>
                <select
                  id="codeExpires"
                  value={codeExpiresInDays}
                  onChange={(e) => setCodeExpiresInDays(parseInt(e.target.value))}
                  className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                </select>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowInviteModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={inviting} size="sm">
              {inviting ? 'Processing...' : inviteType === 'email' ? 'Send Invite' : 'Create Code'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

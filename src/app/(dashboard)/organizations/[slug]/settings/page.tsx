'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings, Users, CreditCard, Building, Loader2, Save, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [success, setSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleDeleteOrg = async () => {
    if (deleteConfirmText !== organization?.slug) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/organizations/${slug}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/organizations');
      }
    } catch (err) {
      console.error('Failed to delete organization:', err);
    } finally {
      setDeleting(false);
    }
  };

  const fetchOrganization = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${slug}`);
      if (res.ok) {
        const json = await res.json();
        const data = json?.data ?? json;
        setOrganization(data);
        setName(data.name);
      }
    } catch (err) {
      console.error('Failed to fetch organization:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const res = await fetch(`/api/organizations/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { icon: Settings, name: 'General Settings', description: 'Organization name and details', href: null, action: null },
    { icon: Users, name: 'Members', description: 'Team members and roles', href: `/organizations/${slug}/members`, action: null },
    { icon: CreditCard, name: 'Billing', description: 'Plans and payment methods', href: `/organizations/${slug}/billing`, action: null },
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
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your organization settings</p>
      </div>

      {/* General Settings */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Building className="h-5 w-5 text-foreground" />
            <div>
              <h3 className="font-medium text-foreground">General Settings</h3>
              <p className="text-xs text-muted-foreground">Organization name and details</p>
            </div>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Organization"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={organization?.slug || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-[10px] text-muted-foreground">URL: /organizations/{organization?.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={saving} size="sm">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              {success && (
                <span className="text-xs text-green-500">Saved successfully!</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Quick Links</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {sections.slice(1).map((section) => (
            <Link key={section.name} href={section.href || '#'}>
              <Card className="bg-card border-border hover:border-border-hover cursor-pointer transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <section.icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium text-foreground">{section.name}</h3>
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-8 pt-6 border-t border-border">
        <h2 className="text-sm font-semibold text-danger mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Danger Zone
        </h2>
        <Card className="bg-card border-danger/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">Delete Organization</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Once you delete an organization, there is no going back. All projects and secrets will be permanently deleted.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
        title="Delete Organization"
      >
        <div className="space-y-4">
          <div className="rounded-md bg-danger/10 p-3 border border-danger/20">
            <p className="text-sm text-danger font-medium">
              This action cannot be undone.
            </p>
            <p className="text-xs text-danger/80 mt-1">
              All projects, secrets, and data associated with this organization will be permanently deleted.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmDelete">
              Type <span className="font-mono font-bold">{organization?.slug || 'your-org-slug'}</span> to confirm
            </Label>
            <Input
              id="confirmDelete"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={organization?.slug ? `e.g. ${organization.slug}` : 'your-org-slug'}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={deleteConfirmText !== organization?.slug || deleting}
              onClick={handleDeleteOrg}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Organization'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

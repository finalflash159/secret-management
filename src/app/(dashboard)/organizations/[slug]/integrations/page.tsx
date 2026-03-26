'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Plus, Trash2, RefreshCw, CheckCircle, XCircle, Loader2, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useToast } from '@/components/ui/toast';
import { integrationTypes } from '@/config/integrations';

interface Integration {
  id: string;
  type: string;
  name: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  _count: {
    syncs: number;
  };
}

interface IntegrationType {
  id: string;
  name: string;
  logo: string;
  description: string;
  hasBg: boolean;
  bgColor?: string;
  fields: { key: string; label: string; type: string; placeholder: string }[];
}

export default function IntegrationsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { addToast } = useToast();

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [testing, setTesting] = useState<string | null>(null);
  const [userOrgRole, setUserOrgRole] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState<Integration | null>(null);

  // Form state
  const [integrationName, setIntegrationName] = useState('');
  const [config, setConfig] = useState<Record<string, string>>({});

  const fetchIntegrations = useCallback(async () => {
    try {
      const [integrationsRes, sessionRes] = await Promise.all([
        fetch(`/api/organizations/${slug}/integrations`),
        fetch('/api/auth/session'),
      ]);
      if (integrationsRes.ok) {
        const json = await integrationsRes.json();
        setIntegrations(json?.data ?? json);
      }
      if (sessionRes.ok) {
        const sessionJson = await sessionRes.json();
        const orgRes = await fetch(`/api/organizations/${slug}`);
        if (orgRes.ok) {
          const json = await orgRes.json();
          const data = json?.data ?? json;
          const myMembership = data?.members?.find(
            (m: { userId: string }) => m.userId === sessionJson?.user?.id
          );
          setUserOrgRole(myMembership?.role ?? null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch integrations:', err);
    }
  }, [slug]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const getIntegrationType = (typeId: string): IntegrationType | undefined => {
    return integrationTypes.find(t => t.id === typeId) as IntegrationType | undefined;
  };

  const resetForm = () => {
    setIntegrationName('');
    setConfig({});
    setSelectedType('');
  };

  const openCreateModal = (typeId: string) => {
    setSelectedType(typeId);
    const type = getIntegrationType(typeId);
    if (type) {
      setIntegrationName(type.name);
      setConfig({});
    }
    setShowCreateModal(true);
  };

  const handleConfigChange = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateIntegration = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    try {
      const res = await fetch(`/api/organizations/${slug}/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          name: integrationName,
          config,
        }),
      });

      if (res.ok) {
        addToast({ title: 'Integration created', variant: 'success' });
        setShowCreateModal(false);
        resetForm();
        fetchIntegrations();
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Failed to create', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIntegration = async () => {
    if (!confirmDisconnect) return;

    try {
      const res = await fetch(`/api/organizations/${slug}/integrations/${confirmDisconnect.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        addToast({ title: 'Integration disconnected', variant: 'success' });
        fetchIntegrations();
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Failed to disconnect', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    } finally {
      setConfirmDisconnect(null);
    }
  };

  const handleTestConnection = async (integration: Integration) => {
    setTesting(integration.id);
    try {
      const res = await fetch(
        `/api/organizations/${slug}/integrations/${integration.id}?action=test`,
        { method: 'POST' }
      );

      if (res.ok) {
        addToast({ title: 'Connection successful', variant: 'success' });
      } else {
        const data = await res.json();
        addToast({ title: data.error || 'Connection failed', variant: 'error' });
      }
    } catch {
      addToast({ title: 'An error occurred', variant: 'error' });
    } finally {
      setTesting(null);
    }
  };

  const isConnected = (typeId: string) => {
    return integrations.some(i => i.type === typeId);
  };

  const selectedTypeData = getIntegrationType(selectedType);

  if (!userOrgRole || userOrgRole === 'member') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center mb-4">
          <Shield className="h-6 w-6 text-danger" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          You need admin or owner role to manage integrations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground">Connect with external services and tools</p>
      </div>

      {/* Connected Integrations */}
      {integrations.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h2 className="text-base font-semibold text-foreground mb-3">Connected</h2>
            <div className="space-y-3">
              {integrations.map((integration) => {
                const type = getIntegrationType(integration.type);
                return (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-5 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-4 rounded-lg ${type?.hasBg ? (type.bgColor ? '' : 'bg-white') : ''}`} style={type?.bgColor ? { backgroundColor: type.bgColor } : undefined}>
                        {type?.logo && (
                          <Image
                            src={type.logo}
                            alt={type.name}
                            width={56}
                            height={56}
                            className="h-14 w-14"
                          />
                        )}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">{integration.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {integration.lastSyncAt
                            ? `Last sync: ${new Date(integration.lastSyncAt).toLocaleString()}`
                            : 'Never synced'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {integration.isActive ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Test ${integration.name} connection`}
                        onClick={() => handleTestConnection(integration)}
                        disabled={testing === integration.id}
                      >
                        {testing === integration.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-5 w-5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Disconnect ${integration.name}`}
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-danger"
                        onClick={() => setConfirmDisconnect(integration)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Integrations */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold text-foreground mb-3">Available Integrations</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {(integrationTypes as IntegrationType[]).map((type) => {
              const connected = isConnected(type.id);
              return (
                <div
                  key={type.id}
                  className={`p-4 rounded-lg border ${
                    connected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  } transition-colors`}
                >
                  <div className="text-center">
                    <div className={`p-5 rounded-lg mx-auto w-fit ${type.hasBg ? (type.bgColor ? '' : 'bg-white') : ''}`} style={type.bgColor ? { backgroundColor: type.bgColor } : undefined}>
                      <Image
                        src={type.logo}
                        alt={type.name}
                        width={48}
                        height={48}
                        className="h-12 w-12"
                      />
                    </div>
                    <p className="mt-3 text-base font-semibold text-foreground">{type.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{type.description}</p>
                    {connected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        disabled
                      >
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Connected
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        aria-label={`Connect ${type.name}`}
                        onClick={() => openCreateModal(type.id)}
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Create Integration Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetForm(); }}
        title={`Connect ${selectedTypeData?.name || 'Integration'}`}
      >
        <form onSubmit={handleCreateIntegration} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={integrationName}
              onChange={(e) => setIntegrationName(e.target.value)}
              placeholder="My Integration"
              required
            />
          </div>

          {selectedTypeData?.fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={field.key}>{field.label}</Label>
              {field.type === 'textarea' ? (
                <textarea
                  id={field.key}
                  value={config[field.key] || ''}
                  onChange={(e) => handleConfigChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="flex min-h-[80px] w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  required
                />
              ) : (
                <Input
                  id={field.key}
                  type={field.type}
                  value={config[field.key] || ''}
                  onChange={(e) => handleConfigChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  required
                />
              )}
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setShowCreateModal(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} size="sm">
              {saving ? 'Connecting...' : 'Connect'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmDisconnect}
        onClose={() => setConfirmDisconnect(null)}
        onConfirm={handleDeleteIntegration}
        title={`Disconnect "${confirmDisconnect?.name}"?`}
        description="The integration will be removed and any synced data will be lost."
        confirmText="Disconnect"
        variant="danger"
      />
    </div>
  );
}

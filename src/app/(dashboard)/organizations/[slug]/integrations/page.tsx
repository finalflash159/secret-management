'use client';

import { Github, Cloud, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function IntegrationsPage() {

  const integrations = [
    { id: 'github', name: 'GitHub', icon: Github, description: 'CI/CD and secrets sync' },
    { id: 'aws', name: 'AWS Secrets Manager', icon: Cloud, description: 'Sync with AWS Secrets Manager' },
    { id: 'gcp', name: 'GCP Secret Manager', icon: Cloud, description: 'Sync with Google Cloud' },
    { id: 'azure', name: 'Azure Key Vault', icon: Cloud, description: 'Sync with Azure Key Vault' },
    { id: 'slack', name: 'Slack', icon: MessageSquare, description: 'Notifications and alerts' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground">Connect with external services and tools</p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-8 text-center">
          <Cloud className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Integrations Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Connect your favorite tools and services to sync secrets automatically.
            Available integrations:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {integrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <div key={integration.id} className="p-4 rounded-lg bg-muted text-center">
                  <Icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">{integration.name}</p>
                  <p className="text-xs text-muted-foreground">{integration.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { Database, Key, Server, Cloud } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function DynamicSecretsPage() {

  const providers = [
    { id: 'postgresql', name: 'PostgreSQL', icon: Database, description: 'Database credentials' },
    { id: 'mysql', name: 'MySQL', icon: Database, description: 'Database credentials' },
    { id: 'mongodb', name: 'MongoDB', icon: Database, description: 'Database credentials' },
    { id: 'redis', name: 'Redis', icon: Server, description: 'Cache credentials' },
    { id: 'aws-rds', name: 'AWS RDS', icon: Cloud, description: 'AWS managed databases' },
    { id: 'api-key', name: 'API Key', icon: Key, description: 'Generated API keys' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dynamic Secrets</h1>
          <p className="text-sm text-muted-foreground">Automatically generated credentials that rotate periodically</p>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-8 text-center">
          <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Dynamic Secrets Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Dynamic secrets are automatically generated credentials that rotate on a schedule.
            Supported providers:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {providers.map((provider) => {
              const Icon = provider.icon;
              return (
                <div key={provider.id} className="p-4 rounded-lg bg-muted text-center">
                  <Icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">{provider.name}</p>
                  <p className="text-xs text-muted-foreground">{provider.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

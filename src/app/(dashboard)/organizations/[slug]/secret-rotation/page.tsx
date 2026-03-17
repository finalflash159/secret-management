'use client';

import { Key, Server, Lock, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function SecretRotationPage() {

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Secret Rotation</h1>
          <p className="text-sm text-muted-foreground">Automatically rotate your secrets on a schedule</p>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-8 text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Secret Rotation Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This feature will allow you to automatically rotate secrets on a schedule.
            Supported secret types include:
          </p>
          <div className="grid grid-cols-3 gap-4 mt-6 max-w-lg mx-auto">
            <div className="p-3 rounded-lg bg-muted">
              <Key className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">API Keys</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <Server className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Database</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <Lock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">OAuth Tokens</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

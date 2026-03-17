'use client';

import { Building } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function BillingPage() {

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your subscription and billing</p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-8 text-center">
          <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Billing Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This feature is currently under development. Contact us at support@gondor.dev for enterprise pricing.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => window.location.href = 'mailto:support@gondor.dev'}>
            Contact Sales
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

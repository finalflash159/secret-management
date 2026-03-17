'use client';

import { useState } from 'react';
import { Plus, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Folder {
  id: string;
  name: string;
  path: string;
  children?: Folder[];
}

export default function FoldersPage() {
  const [folders] = useState<Folder[]>([
    { id: '1', name: 'Production', path: '/production', children: [
      { id: '2', name: 'Database', path: '/production/database' },
      { id: '3', name: 'API', path: '/production/api' },
    ]},
    { id: '4', name: 'Development', path: '/development' },
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Folders</h1>
          <p className="text-sm text-muted-foreground">Organize your secrets in folders</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Folder
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="space-y-1">
            {folders.map((folder) => (
              <div key={folder.id}>
                <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted cursor-pointer">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{folder.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{folder.path}</span>
                </div>
                {folder.children && (
                  <div className="ml-6 border-l border-border">
                    {folder.children.map((child) => (
                      <div key={child.id} className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted cursor-pointer">
                        <Folder className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{child.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{child.path}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

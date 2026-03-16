'use client';

import { memo, useState, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import {
  ChevronRight,
  Bell,
  LogOut,
  User,
  Settings,
  Download,
  Upload,
  Plus,
} from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  name?: string | null;
}

interface HeaderProps {
  user: UserData | null;
  sidebarCollapsed?: boolean;
  organizationSlug?: string | null;
  unreadAlerts?: number;
}

function HeaderComponent({ user, sidebarCollapsed = false, organizationSlug, unreadAlerts = 0 }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { addToast } = useToast();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build breadcrumbs from pathname - memoize to prevent recalculation
  const pathSegments = useMemo(() => pathname.split('/').filter(Boolean), [pathname]);

  const handleSignOut = useCallback(async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  }, []);

  // Handle Import .env file
  const handleImportClick = useCallback(() => {
    setShowImportModal(true);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        // Parse .env file content
        const secrets: Record<string, string> = {};
        content.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...valueParts] = trimmed.split('=');
            const value = valueParts.join('=').replace(/^["']|["']$/g, '');
            secrets[key.trim()] = value;
          }
        });

        // Store in sessionStorage for the secrets page to pick up
        sessionStorage.setItem('importedSecrets', JSON.stringify(secrets));
        setShowImportModal(false);
        addToast({
          title: 'Secrets imported',
          description: `Imported ${Object.keys(secrets).length} secrets from ${file.name}`,
          variant: 'success',
        });
        // Navigate to secrets page
        router.push('/organizations');
      };
      reader.readAsText(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle Export secrets
  const handleExportClick = useCallback(() => {
    setShowExportModal(true);
  }, []);

  const handleExport = (format: 'env' | 'json' | 'yaml') => {
    // Get secrets from sessionStorage (set by the secrets page)
    const secretsStr = sessionStorage.getItem('exportSecrets');
    const secrets = secretsStr ? JSON.parse(secretsStr) : {};

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(secrets, null, 2);
      filename = 'secrets.json';
      mimeType = 'application/json';
    } else if (format === 'yaml') {
      content = Object.entries(secrets)
        .map(([key, value]) => `${key}: "${value}"`)
        .join('\n');
      filename = 'secrets.yaml';
      mimeType = 'text/yaml';
    } else {
      content = Object.entries(secrets)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      filename = '.env';
      mimeType = 'text/plain';
    }

    // Download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setShowExportModal(false);
    addToast({
      title: 'Secrets exported',
      description: `Exported ${Object.keys(secrets).length} secrets to ${filename}`,
      variant: 'success',
    });
  };

  // Handle Add Secret
  const handleAddSecretClick = useCallback(() => {
    router.push('/organizations?addSecret=true');
  }, [router]);

  return (
    <>
      <header
        className={cn(
          'shrink-0 z-20 h-[52px] border-b border-border bg-card flex items-center justify-between px-6 transition-colors duration-200'
        )}
      >
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5">
          <Link
            href={organizationSlug ? `/organizations/${organizationSlug}` : '/organizations'}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {organizationSlug || 'organizations'}
          </Link>
          {pathSegments.slice(1).map((segment, index) => {
            const href = '/' + pathSegments.slice(0, index + 2).join('/');
            const isLast = index === pathSegments.length - 2;
            const label = segment.replace(/-/g, ' ');

            return (
              <span key={href} className="flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                {isLast ? (
                  <span className="text-sm font-semibold capitalize text-foreground">
                    {label}
                  </span>
                ) : (
                  <Link
                    href={href}
                    className="text-sm capitalize text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Import .env */}
          <button
            onClick={handleImportClick}
            className="flex items-center gap-1.5 rounded-md border border-border bg-transparent px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Import .env</span>
          </button>

          {/* Export */}
          <button
            onClick={handleExportClick}
            className="flex items-center gap-1.5 rounded-md border border-border bg-transparent px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Add Secret */}
          <button
            onClick={handleAddSecretClick}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Secret</span>
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-border mx-1" />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <Link
            href={organizationSlug ? `/organizations/${organizationSlug}/alerts` : '/organizations/alerts'}
            className="relative flex h-8 w-8 items-center justify-center rounded-md border border-border bg-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            {unreadAlerts > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </span>
            )}
          </Link>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-muted"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-gold/80 to-gold text-[11px] font-bold text-foreground">
                {user?.name?.charAt(0) || 'U'}
              </div>
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-card py-1.5 shadow-xl animate-fadeIn">
                  <div className="border-b border-border px-3 pb-2.5 mb-1.5">
                    <p className="text-sm font-semibold text-foreground">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <Link
                    href={organizationSlug ? `/organizations/${organizationSlug}/settings/profile` : '#'}
                    onClick={() => setShowUserMenu(false)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  {organizationSlug && (
                    <Link
                      href={`/organizations/${organizationSlug}/settings`}
                      onClick={() => setShowUserMenu(false)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  )}
                  <div className="border-t border-border mt-1.5 pt-1.5">
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Secrets"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select a .env file to import secrets. The file should contain key-value pairs in the format KEY=value.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".env,.txt"
            onChange={handleFileSelect}
            className="block w-full text-sm text-muted-foreground
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-primary-foreground
              hover:file:opacity-90
              cursor-pointer"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowImportModal(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Secrets"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose a format to export your secrets.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleExport('env')}
              className="flex flex-col items-center justify-center rounded-lg border border-border p-4 hover:bg-muted transition-colors"
            >
              <span className="text-2xl mb-2">.env</span>
              <span className="text-xs text-muted-foreground">Environment</span>
            </button>
            <button
              onClick={() => handleExport('json')}
              className="flex flex-col items-center justify-center rounded-lg border border-border p-4 hover:bg-muted transition-colors"
            >
              <span className="text-2xl mb-2">{'{}'}</span>
              <span className="text-xs text-muted-foreground">JSON</span>
            </button>
            <button
              onClick={() => handleExport('yaml')}
              className="flex flex-col items-center justify-center rounded-lg border border-border p-4 hover:bg-muted transition-colors"
            >
              <span className="text-2xl mb-2">YAML</span>
              <span className="text-xs text-muted-foreground">YAML</span>
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowExportModal(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// Export memoized version
const Header = memo(HeaderComponent);
export { Header };

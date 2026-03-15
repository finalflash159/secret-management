'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Only run on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if already authenticated
  useEffect(() => {
    if (!mounted) return;

    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.user) {
          setIsAuthenticated(true);
          window.location.href = '/organizations';
        }
      } catch {
        // ignore
      }
    };
    checkSession();
  }, [mounted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        // Use window.location for reliable redirect
        window.location.href = '/organizations';
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (!mounted || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <Logo width={140} height={48} />
        </div>

        <Card>
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="text-base">Sign in</CardTitle>
            <CardDescription className="text-xs">
              Enter your email and password to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="rounded-md bg-[var(--danger)]/10 p-2 text-xs text-[var(--danger)] border border-[var(--danger)]/20">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
            <div className="mt-3 text-center text-xs">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-[var(--primary)] hover:underline">
                Register
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

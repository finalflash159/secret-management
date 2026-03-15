'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, inviteCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      // Redirect to login after successful registration
      router.push('/login?registered=true');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <Logo width={140} height={48} />
        </div>

        <Card>
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="text-base">Create an account</CardTitle>
            <CardDescription className="text-xs">
              Enter your details and invitation code to register
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
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
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
                  minLength={8}
                />
                <p className="text-[10px] text-[var(--muted-foreground)]">Must be at least 8 characters</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inviteCode">Invitation Code</Label>
                <Input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter invitation code"
                  required
                />
                <p className="text-[10px] text-[var(--muted-foreground)]">Contact your administrator for the invitation code</p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
            <div className="mt-3 text-center text-xs">
              Already have an account?{' '}
              <Link href="/login" className="text-[var(--primary)] hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

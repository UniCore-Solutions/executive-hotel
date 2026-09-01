'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, LogIn, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSession } from '@/context/SessionContext';

const NOT_STAFF_MESSAGE = "That account doesn't have admin access. Sign in with a staff account.";

// `useSearchParams` (for the `?error=not_staff` redirect message) needs a
// Suspense boundary to keep this route statically prerenderable.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'not_staff' ? NOT_STAFF_MESSAGE : null,
  );
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? 'Sign in failed.');
        return;
      }
      await refresh();
      router.push('/hotels');
    } catch {
      setError('Could not reach the platform. Is the backend running?');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — platform identity, not any one hotel's (§ multi-hotel-ready). */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-dark px-12 py-12 text-white lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-gold/10 blur-3xl"
        />

        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold text-navy-dark">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-display text-base font-semibold tracking-wide">
            Hotel Collection
            <span className="mt-0.5 block text-[10px] font-sans font-medium tracking-widest text-gold-light uppercase">
              Admin
            </span>
          </span>
        </div>

        <div className="relative max-w-sm">
          <h1 className="font-display text-3xl leading-tight font-semibold text-balance">
            Every property, one console.
          </h1>
          <p className="mt-3 text-sm text-white/60">
            Reservations, inventory, rates and guests — scoped to the hotel you manage, or
            all of them, depending on your role.
          </p>
        </div>

        <p className="relative text-xs text-white/35">© {new Date().getFullYear()} Hotel Collection</p>
      </div>

      {/* Sign-in panel */}
      <div className="flex items-center justify-center bg-paper px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold text-navy-dark">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-display text-base font-semibold tracking-wide text-ink">Hotel Collection</span>
          </div>

          <h2 className="font-display text-2xl font-semibold text-ink">Sign in</h2>
          <p className="mt-1 mb-7 text-sm text-muted-foreground">Use your staff email and password.</p>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-clay/25 bg-clay/10 px-3 py-2.5 text-sm text-clay-dark"
              >
                <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" loading={submitting}>
              <LogIn className="size-4" aria-hidden="true" />
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}

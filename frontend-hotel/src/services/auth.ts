/** Auth — calls this app's own BFF (/api/auth/*), which holds the backend
    JWT in an httpOnly cookie (lib/session.ts). The browser never sees the
    token; SessionContext is the source of truth for "am I signed in", kept
    up to date by calling fetchSession()/login()/register()/logout() below —
    there is no longer a module-level token/session singleton. */
import type { Session } from '@/types';

export interface AuthResult {
  ok: boolean;
  message?: string;
  user?: { email: string; name: string };
  session?: Session;
}

interface MeResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  roles: string[];
  hotelIds: string[];
}

function displayName(me: Pick<MeResponse, 'email' | 'firstName' | 'lastName'>): string {
  const combined = [me.firstName, me.lastName].filter(Boolean).join(' ').trim();
  if (combined) return combined;
  const local = me.email.split('@')[0] ?? '';
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function toSession(me: MeResponse): Session {
  return {
    id: me.id,
    email: me.email,
    name: displayName(me),
    firstName: me.firstName,
    lastName: me.lastName,
    phone: me.phone,
    roles: me.roles,
    hotelIds: me.hotelIds,
    // The JWT lives only in the httpOnly cookie — nothing client-side reads
    // this field; kept for Session's existing shape.
    token: '',
    at: Date.now(),
  };
}

/** Restores the session from the httpOnly cookie — call on app mount and
    after login/register/profile changes. Returns null when signed out. */
export async function fetchSession(): Promise<Session | null> {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    const data = (await res.json()) as { me: MeResponse | null };
    return data.me ? toSession(data.me) : null;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { ok: false, message: body?.error ?? 'Incorrect email or password.' };
    }
    const session = await fetchSession();
    if (!session) return { ok: false, message: 'Signed in, but could not load your profile.' };
    return { ok: true, user: { email: session.email, name: session.name }, session };
  } catch {
    return { ok: false, message: 'Network error. Please try again.' };
  }
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  try {
    const nameParts = input.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') || firstName;
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email: input.email, password: input.password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { ok: false, message: body?.error ?? 'Registration failed.' };
    }
    const session = await fetchSession();
    if (!session) return { ok: false, message: 'Registered, but could not load your profile.' };
    return { ok: true, user: { email: session.email, name: session.name }, session };
  } catch {
    return { ok: false, message: 'Network error. Please try again.' };
  }
}

export async function reset(email: string): Promise<AuthResult> {
  if (!email || !String(email).includes('@'))
    return { ok: false, message: 'Enter a valid email address.' };
  return { ok: true, message: 'If an account exists for this email, a reset link has been sent.' };
}

/** Updates the signed-in guest's name/phone and returns the refreshed session. */
export async function updateProfile(input: {
  firstName?: string;
  lastName?: string;
  phone?: string;
}): Promise<AuthResult> {
  try {
    const res = await fetch('/api/auth/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    const body = (await res.json()) as { me?: MeResponse; error?: string };
    if (!res.ok || !body.me) {
      return { ok: false, message: body.error ?? 'Could not update your profile.' };
    }
    const session = toSession(body.me);
    return { ok: true, user: { email: session.email, name: session.name }, session };
  } catch {
    return { ok: false, message: 'Network error. Please try again.' };
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    /* best-effort — worst case the cookie expires on its own */
  }
}

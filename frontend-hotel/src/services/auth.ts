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

/** {@link register}'s result: no `user`/`session` (the account isn't usable
    yet), just enough to drive the OTP-entry step. */
export interface RegisterResult {
  ok: boolean;
  message?: string;
  email?: string;
  otpExpiresInMinutes?: number;
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

/**
 * Sends an OTP to the given email — the account stays unusable until
 * {@link verifyRegistration} confirms the code, so this never yields a
 * session (there is no `user`/`session` on success, unlike {@link login}).
 */
export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<RegisterResult> {
  try {
    const nameParts = input.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') || firstName;
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email: input.email, password: input.password }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, message: body?.error ?? 'Registration failed.' };
    }
    return { ok: true, email: body?.email, otpExpiresInMinutes: body?.otpExpiresInMinutes };
  } catch {
    return { ok: false, message: 'Network error. Please try again.' };
  }
}

/** Confirms the OTP sent by {@link register} and, on success, establishes
    the real session — this is the step that actually signs the guest in. */
export async function verifyRegistration(email: string, code: string): Promise<AuthResult> {
  try {
    const res = await fetch('/api/auth/register/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { ok: false, message: body?.error ?? 'That code is incorrect or has expired.' };
    }
    const session = await fetchSession();
    if (!session) return { ok: false, message: 'Verified, but could not load your profile.' };
    return { ok: true, user: { email: session.email, name: session.name }, session };
  } catch {
    return { ok: false, message: 'Network error. Please try again.' };
  }
}

/** Re-sends the registration OTP. Always resolves ok on a normal cooldown-
    free call; a `message` on failure explains why (e.g. "please wait"). */
export async function resendRegistrationOtp(email: string): Promise<AuthResult> {
  try {
    const res = await fetch('/api/auth/register/resend', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { ok: false, message: body?.error ?? 'Could not resend the code. Please try again.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: 'Network error. Please try again.' };
  }
}

export async function reset(email: string): Promise<AuthResult> {
  if (!email || !String(email).includes('@'))
    return { ok: false, message: 'Enter a valid email address.' };
  return {
    ok: false,
    message: 'Password reset is not available yet — please contact the hotel reception.',
  };
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

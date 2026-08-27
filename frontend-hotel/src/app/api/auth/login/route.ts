import { NextResponse } from 'next/server';
import { setSessionCookie } from '@/lib/session';

// API_INTERNAL_URL is the server-side GraphQL URL (…/graphql); the REST auth
// endpoints live one level up, at the same host.
const BACKEND_BASE = (process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:8180/graphql').replace(
  /\/graphql\/?$/,
  ''
);
const AUTH_URL = `${BACKEND_BASE}/api/v1/auth`;

export async function POST(request: Request): Promise<NextResponse> {
  let input: { email?: string; password?: string };
  try {
    input = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (typeof input.email !== 'string' || typeof input.password !== 'string') {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
  }
  const res = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: input.email, password: input.password }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return NextResponse.json(
      { error: body?.message ?? 'Incorrect email or password.' },
      { status: res.status === 500 ? 502 : res.status }
    );
  }
  // The REST response's `me` shape (userId/email/roles/hotelIds) differs from
  // the GraphQL `me` query's (id/email/firstName/lastName/phone/roles/
  // hotelIds); rather than reconcile two shapes here, the client re-fetches
  // the full profile via GET /api/auth/me right after this call succeeds.
  const data: { token: string } = await res.json();
  await setSessionCookie(data.token);
  return NextResponse.json({ ok: true });
}

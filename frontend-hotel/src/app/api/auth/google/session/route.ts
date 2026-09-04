import { NextResponse } from 'next/server';
import { isHttpsRequest, setSessionCookie } from '@/lib/session';

const BACKEND_BASE = (process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:8180/graphql').replace(
  /\/graphql\/?$/,
  ''
);
// Versionless on purpose — see start/route.ts.
const EXTERNAL_AUTH_URL = `${BACKEND_BASE}/api/auth`;

/**
 * Redeems the one-time login grant minted by the backend's OAuth callback —
 * the step that actually signs the guest in. Same shape as login/route.ts
 * and register/verify/route.ts: reads the backend's token, sets the same
 * httpOnly session cookie, and lets the client re-fetch the full profile via
 * GET /api/auth/me.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let input: { grant?: string };
  try {
    input = (await request.json()) as { grant?: string };
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (typeof input.grant !== 'string' || !input.grant) {
    return NextResponse.json({ error: 'grant is required' }, { status: 400 });
  }
  const res = await fetch(`${EXTERNAL_AUTH_URL}/oauth/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grant: input.grant }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return NextResponse.json(
      { error: body?.message ?? 'Could not complete Google sign-in.' },
      { status: res.status === 500 ? 502 : res.status }
    );
  }
  const data: { token: string } = await res.json();
  await setSessionCookie(data.token, isHttpsRequest(request));
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { isHttpsRequest, setSessionCookie } from '@/lib/session';

const BACKEND_BASE = (process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:8180/graphql').replace(
  /\/graphql\/?$/,
  ''
);
const AUTH_URL = `${BACKEND_BASE}/api/v1/auth`;

/**
 * Confirms the OTP sent by POST /api/auth/register and, on success, sets the
 * session cookie — this is the step that actually makes the account usable.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let input: { email?: string; code?: string };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (typeof input.email !== 'string' || typeof input.code !== 'string') {
    return NextResponse.json({ error: 'email and code are required' }, { status: 400 });
  }
  const res = await fetch(`${AUTH_URL}/register/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: input.email, code: input.code }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return NextResponse.json(
      { error: body?.message ?? 'That code is incorrect or has expired.' },
      { status: res.status === 500 ? 502 : res.status }
    );
  }
  // See login/route.ts: the client re-fetches the full profile via
  // GET /api/auth/me right after this call succeeds.
  const data: { token: string } = await res.json();
  await setSessionCookie(data.token, isHttpsRequest(request));
  return NextResponse.json({ ok: true });
}

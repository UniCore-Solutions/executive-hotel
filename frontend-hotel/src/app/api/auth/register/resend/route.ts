import { NextResponse } from 'next/server';

const BACKEND_BASE = (process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:8180/graphql').replace(
  /\/graphql\/?$/,
  ''
);
const AUTH_URL = `${BACKEND_BASE}/api/v1/auth`;

/**
 * Re-sends the registration OTP. Always resolves `{ ok: true }` — the
 * backend responds 204 whether or not the email has anything pending, by
 * design (anti-enumeration), so this route never leaks that distinction
 * either.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let input: { email?: string };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (typeof input.email !== 'string') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }
  const res = await fetch(`${AUTH_URL}/register/resend`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: input.email }),
    cache: 'no-store',
  });
  if (res.status === 409 || res.status === 429) {
    const body = await res.json().catch(() => null);
    return NextResponse.json(
      { error: body?.message ?? 'Please wait before requesting another code.' },
      { status: res.status }
    );
  }
  if (!res.ok) {
    return NextResponse.json({ error: 'Could not resend the code. Please try again.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

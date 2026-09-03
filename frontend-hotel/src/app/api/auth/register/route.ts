import { NextResponse } from 'next/server';

const BACKEND_BASE = (process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:8180/graphql').replace(
  /\/graphql\/?$/,
  ''
);
const AUTH_URL = `${BACKEND_BASE}/api/v1/auth`;

/**
 * Sends an OTP to the given email — no session yet. The account stays
 * `pending_verification` until POST /api/auth/register/verify succeeds; see
 * that route for the step that actually sets the session cookie.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let input: { firstName?: string; lastName?: string; email?: string; password?: string };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (
    typeof input.firstName !== 'string' ||
    typeof input.lastName !== 'string' ||
    typeof input.email !== 'string' ||
    typeof input.password !== 'string'
  ) {
    return NextResponse.json({ error: 'all fields are required' }, { status: 400 });
  }
  const res = await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      password: input.password,
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return NextResponse.json(
      { error: body?.message ?? 'Registration failed.' },
      { status: res.status === 500 ? 502 : res.status }
    );
  }
  const data: { email: string; otpExpiresInMinutes: number } = await res.json();
  return NextResponse.json({ ok: true, email: data.email, otpExpiresInMinutes: data.otpExpiresInMinutes });
}

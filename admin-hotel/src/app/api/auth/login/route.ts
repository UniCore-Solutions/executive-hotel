import { NextResponse } from 'next/server';
import { setSessionCookie } from '@/lib/session';

const BACKEND_REST_URL =
  (process.env.HOTEL_API_URL ?? 'http://localhost:8180/graphql').replace(/\/graphql\/?$/, '') +
  '/api/v1';

interface LoginEnvelope {
  token: string;
  me: { id: string; email: string; firstName?: string | null; lastName?: string | null };
}

/** Login — REST write (POST /api/v1/auth/login; API rule: GraphQL = READ,
    REST = WRITE/ACTION). The returned JWT goes into the httpOnly
    admin_session cookie; the browser never sees it. */
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
  try {
    const res = await fetch(BACKEND_REST_URL + '/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: input.email, password: input.password }),
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => null)) as
      | LoginEnvelope
      | { code?: string; message?: string }
      | null;
    if (!res.ok || !body || !('token' in body)) {
      const err = body as { code?: string; message?: string } | null;
      return NextResponse.json(
        { error: err?.message ?? 'Incorrect email or password.', code: err?.code ?? 'UNAUTHORIZED' },
        { status: 401 },
      );
    }
    await setSessionCookie(body.token);
    return NextResponse.json({ me: body.me });
  } catch {
    return NextResponse.json({ error: 'Could not reach the platform.' }, { status: 502 });
  }
}

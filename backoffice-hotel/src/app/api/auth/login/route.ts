import { NextResponse } from 'next/server';
import { ApiError, serverRequest } from '@/lib/api';
import { setSessionCookie } from '@/lib/session';
import { LoginDocument } from '@/graphql/generated/graphql';

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
    const data = await serverRequest(LoginDocument, {
      input: { email: input.email, password: input.password },
    });
    setSessionCookie(data.login.token);
    return NextResponse.json({ me: data.login.me });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code ?? 'UNAUTHORIZED' },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: 'sign in failed' }, { status: 502 });
  }
}
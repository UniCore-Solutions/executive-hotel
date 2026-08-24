import { NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/session';
import { serverRequest } from '@/lib/api';
import { MeDocument } from '@/graphql/generated/graphql';

export async function POST(request: Request): Promise<NextResponse> {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { query, variables } = body as { query?: string; variables?: Record<string, unknown> };
  if (typeof query !== 'string') {
    return NextResponse.json({ error: 'missing query' }, { status: 400 });
  }
  const res = await fetch(process.env.HOTEL_API_URL ?? 'http://localhost:8080/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables: variables ?? {} }),
    cache: 'no-store',
  });
  const payload = await res.text();
  return new NextResponse(payload, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(): Promise<NextResponse> {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    await serverRequest(MeDocument, {}, token);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
}
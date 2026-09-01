import { NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/session';
import { rejectCrossOrigin } from '@/lib/originCheck';

const BACKEND_GRAPHQL_URL = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:8180/graphql';

/**
 * Browser-side GraphQL proxy. Unlike backoffice-hotel's equivalent route,
 * auth is optional here — most of this site's traffic (search, catalog,
 * anonymous booking) has no session at all, so a missing cookie is not an
 * error. When a session cookie IS present, its Bearer token is injected
 * server-side; the browser itself never has access to it (see lib/session.ts).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const originRejection = rejectCrossOrigin(request);
  if (originRejection) return originRejection;

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const token = await getSessionToken();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers['authorization'] = `Bearer ${token}`;

  const res = await fetch(BACKEND_GRAPHQL_URL, {
    method: 'POST',
    headers,
    body,
    cache: 'no-store',
  });
  const payload = await res.text();
  return new NextResponse(payload, {
    status: res.status,
    headers: { 'content-type': 'application/json' },
  });
}

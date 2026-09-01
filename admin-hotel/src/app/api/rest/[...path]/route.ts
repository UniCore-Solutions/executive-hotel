import { NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/session';

const BACKEND_REST_URL =
  (process.env.HOTEL_API_URL ?? 'http://localhost:8180/graphql').replace(/\/graphql\/?$/, '') +
  '/api/v1';

/**
 * Browser-side REST proxy — the write/action counterpart of /api/graphql.
 * Requires a session (the admin is auth-walled): without the httpOnly
 * admin_session cookie the backend would reject anyway, so fail fast with
 * 401. Multipart/form-data passes through as FormData so file uploads reach
 * the backend intact.
 */
async function handler(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { path } = await params;
  const url = new URL(request.url);
  const target = `${BACKEND_REST_URL}/${path.join('/')}${url.search}`;

  const contentType = request.headers.get('content-type') ?? '';
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };

  let body: BodyInit | undefined;
  if (request.method === 'GET' || request.method === 'DELETE') {
    body = undefined;
  } else if (contentType.includes('multipart/form-data')) {
    body = await request.formData();
  } else {
    body = await request.text();
    headers['content-type'] = contentType || 'application/json';
  }

  const res = await fetch(target, {
    method: request.method,
    headers,
    body,
    cache: 'no-store',
  });
  const payload = await res.text();
  return new NextResponse(payload, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};

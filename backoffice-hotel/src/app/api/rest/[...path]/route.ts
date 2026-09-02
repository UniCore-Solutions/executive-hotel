import { NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/session';

const BACKEND_REST_URL =
  (process.env.HOTEL_API_URL ?? 'http://localhost:8180/graphql').replace(
    /\/graphql\/?$/,
    ''
  ) + '/api/v1';

/**
 * Browser-side REST proxy — the write/action counterpart of /api/graphql.
 * Requires a session (the back-office is auth-walled): without the httpOnly
 * bo_session cookie the backend would reject anyway, so fail fast with 401.
 * Multipart/form-data passes through as FormData so file uploads reach the
 * backend intact.
 */
export async function handler(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { path } = await params;
  const url = new URL(request.url);
  // BACKEND_REST_URL already ends in /api/v1, so a caller-supplied leading
  // "v1/" (endpoints.ts calls restClient.post('/v1/admin/...')) doubled it
  // into /api/v1/v1/... — every write in this app was 404ing against the
  // real backend. Same fix already applied to frontend-hotel's identical
  // proxy; paths without the prefix keep working unchanged.
  const apiPath = path.join('/').replace(/^v1\//, '');
  const target = `${BACKEND_REST_URL}/${apiPath}${url.search}`;

  const contentType = request.headers.get('content-type') ?? '';
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };

  let body: BodyInit | undefined;
  if (request.method === 'GET' || request.method === 'HEAD') {
    // fetch() rejects any body at all on GET/HEAD, and request.text() on a
    // bodyless GET yields '' (not undefined) — sending that as `body` throws.
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
  // A null-body status (204/205/304, e.g. the media DELETE endpoint) cannot
  // carry a body per the Fetch spec, not even an empty string — constructing
  // a NextResponse with one throws. Same fix already applied to admin-hotel's
  // proxy.
  const nullBodyStatus = res.status === 204 || res.status === 205 || res.status === 304;
  return new NextResponse(nullBodyStatus ? null : payload, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };

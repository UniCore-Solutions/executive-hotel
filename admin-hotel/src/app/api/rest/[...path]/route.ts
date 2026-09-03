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
  const responseContentType = res.headers.get('content-type') ?? 'application/json';
  // A null-body status (204/205/304 — e.g. the media DELETE endpoint's
  // `ResponseEntity.noContent()`) cannot carry a body per the Fetch spec,
  // not even an empty string: `new NextResponse('', { status: 204 })`
  // throws ("Response with null body status cannot have body"), crashing
  // this route with an opaque 500 while the backend write had already
  // succeeded. Found live while testing the new hotel Media tab's delete
  // action — it equally affects the pre-existing room-type media delete,
  // which goes through this same proxy.
  const nullBodyStatus = res.status === 204 || res.status === 205 || res.status === 304;
  if (nullBodyStatus) {
    return new NextResponse(null, { status: res.status, headers: { 'content-type': responseContentType } });
  }
  // Binary responses (e.g. the invoice/credit-note PDF download) must not go
  // through `res.text()` — decoding non-UTF8 bytes as text and re-encoding
  // them corrupts the body. Anything not text/JSON is passed through as
  // an ArrayBuffer instead.
  const isText = /^(text\/|application\/(json|.*\+json|xml|.*\+xml|x-www-form-urlencoded))/i.test(
    responseContentType,
  );
  const payload = isText ? await res.text() : await res.arrayBuffer();
  return new NextResponse(payload, {
    status: res.status,
    headers: { 'content-type': responseContentType },
  });
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};

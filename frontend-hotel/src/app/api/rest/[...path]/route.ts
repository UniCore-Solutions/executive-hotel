import { NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/session';

const BACKEND_REST_URL =
  (process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:8180/graphql').replace(
    /\/graphql\/?$/,
    ''
  ) + '/api/v1';

/**
 * Browser-side REST proxy — the counterpart of /api/graphql for WRITE/ACTION
 * calls. Forwards method, body (JSON or multipart/form-data) and query
 * string to the backend, injecting the Bearer token from the httpOnly
 * session cookie server-side. Multipart bodies pass through as FormData so
 * file uploads reach the backend intact.
 */
export async function handler(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params;
  const url = new URL(request.url);
  // The REST client mirrors the backend's versioned paths
  // (/api/rest/v1/reservations). The proxy already targets the versioned
  // root (BACKEND_REST_URL ends in /api/v1), so a redundant leading "v1"
  // must be dropped — otherwise the backend sees /api/v1/v1/reservations
  // and rejects it as unauthenticated. Paths without the prefix
  // (/api/rest/reservations) keep working unchanged.
  const apiPath = path.join('/').replace(/^v1\//, '');
  const target = `${BACKEND_REST_URL}/${apiPath}${url.search}`;

  const token = await getSessionToken();
  const contentType = request.headers.get('content-type') ?? '';

  // Forward the client's headers (Idempotency-Key, content-type, ...) so
  // backend contracts that read non-auth headers keep working through the
  // BFF; hop-by-hop/transport headers are never forwarded, and the session
  // Bearer is injected server-side (replacing any client-set authorization).
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (!['host', 'connection', 'content-length', 'transfer-encoding', 'accept-encoding'].includes(k)) {
      headers[key] = value;
    }
  });
  if (token) headers['authorization'] = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (contentType.includes('multipart/form-data')) {
    // Pass the FormData through — fetch sets the multipart boundary itself,
    // so no content-type is forwarded (the backend parses it normally).
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

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };

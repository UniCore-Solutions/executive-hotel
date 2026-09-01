import { NextResponse } from 'next/server';

/**
 * Defence-in-depth same-origin check for the BFF proxy routes.
 *
 * The session cookie (`guest_session`) is `SameSite=Lax`, which already
 * blocks classic cross-site POST CSRF (a foreign site cannot get the
 * browser to attach the cookie on a cross-site POST). This check does not
 * close a live vulnerability — it's a second layer: if `SameSite=Lax`
 * handling is ever weakened (older browser, a future `SameSite=None`
 * change, etc.) a mismatched `Origin` is still rejected here.
 *
 * Requests with no `Origin` header (same-origin non-CORS requests, and
 * server-side/internal calls) are allowed through unchanged.
 */
export function rejectCrossOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;

  // Compare against the host the BROWSER addressed, not `new URL(request.url)`.
  // Behind a reverse proxy or load balancer the request URL carries the
  // internal address (e.g. http://frontend:3000) while the browser sends
  // `Origin: https://book.example.com` — comparing the two would reject every
  // legitimate request in production. `x-forwarded-host` is the proxy's record
  // of the public host; `host` covers the direct case.
  const expectedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!expectedHost) return null;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    // A malformed Origin is not something a browser sends.
    return NextResponse.json({ error: 'cross-origin request rejected' }, { status: 403 });
  }

  if (originHost === expectedHost) return null;

  return NextResponse.json({ error: 'cross-origin request rejected' }, { status: 403 });
}

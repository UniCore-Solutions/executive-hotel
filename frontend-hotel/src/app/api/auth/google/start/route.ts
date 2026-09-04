import { NextResponse } from 'next/server';
import { isSafeInternalPath } from '@/lib/safeRedirect';

// Unlike every other /api/auth/* route in this app, this redirect is sent to
// the BROWSER (a 302 Location header), not fetched server-side — so it must
// use the backend's actual host-reachable address, never API_INTERNAL_URL
// (that's the Docker-internal "backend" hostname, which only resolves inside
// the compose network and produces a DNS error in the browser).
const BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL ?? 'http://localhost:8180';
// Versionless on purpose — the redirect_uri is registered with Google itself
// and must be a fixed URL, so ExternalAuthRestController lives at /api/auth,
// not /api/v1/auth like the rest of this app's auth endpoints.
const EXTERNAL_AUTH_URL = `${BACKEND_PUBLIC_URL}/api/auth`;

/**
 * Starts Google sign-in. The browser's only cross-origin hop for this leg is
 * to the backend (which then redirects to Google) — it never needs to know
 * the backend's host beyond this one redirect, same principle as every other
 * same-origin `/api/auth/*` route in this app.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const redirect = searchParams.get('redirect');
  const safeRedirect = isSafeInternalPath(redirect) ? redirect : null;
  const target = `${EXTERNAL_AUTH_URL}/google${safeRedirect ? `?redirect=${encodeURIComponent(safeRedirect)}` : ''}`;
  return NextResponse.redirect(target);
}

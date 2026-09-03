import { cookies } from 'next/headers';

/** Distinct from the existing back-office's `bo_session` so both admins can
    run authenticated sessions side by side during migration. */
export const SESSION_COOKIE = 'admin_session';
const MAX_AGE = 60 * 60 * 24 * 7;

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/**
 * Whether the *browser-facing* connection is HTTPS — deliberately not
 * `NODE_ENV === 'production'`. This app's Docker image hardcodes
 * `NODE_ENV=production` in the runner stage regardless of how it's actually
 * served, and this deployment (and local dev) is plain `http://localhost`
 * with no TLS termination. A `Secure` cookie set over `http://` is silently
 * dropped by the browser — no error, no console warning — so login
 * "succeeds" (200, `{ me }`) but the very next request has no session and
 * the layout guard bounces back to `/login`. That reproduces on *every*
 * login, which is exactly the "I need to log in each time" symptom this
 * fixes. `x-forwarded-proto` covers a real reverse-proxy TLS-termination
 * deployment; the request's own URL scheme covers everything else.
 */
export function isHttpsRequest(request: Request): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) return (forwardedProto.split(',')[0] ?? '').trim() === 'https';
  return new URL(request.url).protocol === 'https:';
}

export async function setSessionCookie(token: string, secure: boolean): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

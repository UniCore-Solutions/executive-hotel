import { cookies } from 'next/headers';

/** httpOnly session cookie holding the backend JWT — the browser never sees
    the token itself. Mirrors backoffice-hotel's proven session pattern. */
export const SESSION_COOKIE = 'guest_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

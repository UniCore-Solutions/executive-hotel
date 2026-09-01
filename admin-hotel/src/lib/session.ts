import { cookies } from 'next/headers';

/** Distinct from the existing back-office's `bo_session` so both admins can
    run authenticated sessions side by side during migration. */
export const SESSION_COOKIE = 'admin_session';
const MAX_AGE = 60 * 60 * 24 * 7;

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

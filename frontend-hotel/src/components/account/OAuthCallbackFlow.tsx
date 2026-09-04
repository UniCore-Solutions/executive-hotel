'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { isSafeInternalPath } from '@/lib/safeRedirect';

/**
 * Lands here after the backend's Google OAuth callback redirects back with
 * either `?grant=...&redirect=...` (success) or `?oauthError=...` (failure —
 * cancelled consent, invalid state, provider failure, or an account
 * conflict; see AuthRestController/ExternalAuthServiceImpl). A grant is
 * single-use, so this exchanges it exactly once even under React 19 Strict
 * Mode's dev double-invoke.
 */
export default function OAuthCallbackFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completeGoogleLogin } = useSession();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const oauthError = searchParams.get('oauthError');
    if (oauthError) {
      router.replace(`/account?error=${encodeURIComponent(oauthError)}`);
      return;
    }

    const grant = searchParams.get('grant');
    if (!grant) {
      router.replace('/account?error=session_failed');
      return;
    }

    const redirect = searchParams.get('redirect');
    const target = isSafeInternalPath(redirect) ? redirect : '/account';

    completeGoogleLogin(grant).then((result) => {
      router.replace(result.ok ? target : '/account?error=session_failed');
    });
  }, [completeGoogleLogin, router, searchParams]);

  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center" role="status" aria-live="polite">
      <svg className="text-navy h-8 w-8 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <p className="text-navy/60 text-sm font-medium">Signing you in…</p>
    </div>
  );
}

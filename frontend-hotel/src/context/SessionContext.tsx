'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@/types';
import * as auth from '@/services/auth';

export interface SessionContextValue {
  session: Session | null;
  refresh: () => Promise<void>;
  setSession: (u: Session | null) => void;
  login: (email: string, password: string) => Promise<auth.AuthResult>;
  /** Sends a registration OTP — never establishes a session; see
      {@link verifyRegistration}. */
  register: (input: { name: string; email: string; password: string }) => Promise<auth.RegisterResult>;
  verifyRegistration: (email: string, code: string) => Promise<auth.AuthResult>;
  resendRegistrationOtp: (email: string) => Promise<auth.AuthResult>;
  /** Redeems a Google-SSO login grant — see services/auth.ts. */
  completeGoogleLogin: (grant: string) => Promise<auth.AuthResult>;
  updateProfile: (input: { firstName?: string; lastName?: string; phone?: string }) => Promise<auth.AuthResult>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);

  // Restore the session from the httpOnly cookie on mount — this is what
  // makes sign-in survive a page reload (the JWT itself is never in
  // client-readable storage; see services/auth.ts and lib/session.ts).
  useEffect(() => {
    let alive = true;
    auth.fetchSession().then((s) => {
      if (alive) setSessionState(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setSession = useCallback((u: Session | null) => setSessionState(u), []);
  const refresh = useCallback(async () => {
    setSessionState(await auth.fetchSession());
  }, []);
  const login = useCallback(async (email: string, password: string) => {
    const r = await auth.login(email, password);
    if (r.ok && r.session) setSessionState(r.session);
    return r;
  }, []);
  const register = useCallback(
    (input: { name: string; email: string; password: string }) => auth.register(input),
    []
  );
  const verifyRegistration = useCallback(async (email: string, code: string) => {
    const r = await auth.verifyRegistration(email, code);
    if (r.ok && r.session) setSessionState(r.session);
    return r;
  }, []);
  const resendRegistrationOtp = useCallback((email: string) => auth.resendRegistrationOtp(email), []);
  const completeGoogleLogin = useCallback(async (grant: string) => {
    const r = await auth.completeGoogleLogin(grant);
    if (r.ok && r.session) setSessionState(r.session);
    return r;
  }, []);
  const updateProfile = useCallback(
    async (input: { firstName?: string; lastName?: string; phone?: string }) => {
      const r = await auth.updateProfile(input);
      if (r.ok && r.session) setSessionState(r.session);
      return r;
    },
    []
  );
  const logout = useCallback(async () => {
    await auth.logout();
    setSessionState(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      refresh,
      setSession,
      login,
      register,
      verifyRegistration,
      resendRegistrationOtp,
      completeGoogleLogin,
      updateProfile,
      logout,
    }),
    [
      session,
      refresh,
      setSession,
      login,
      register,
      verifyRegistration,
      resendRegistrationOtp,
      completeGoogleLogin,
      updateProfile,
      logout,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@/types';
import * as auth from '@/services/auth';

export interface SessionContextValue {
  session: Session | null;
  refresh: () => void;
  setSession: (u: Session | null) => void;
  login: (email: string, password: string) => Promise<auth.AuthResult>;
  register: (input: { name: string; email: string; password: string }) => Promise<auth.AuthResult>;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() =>
    typeof window === 'undefined' ? null : auth.session()
  );

  const setSession = useCallback((u: Session | null) => setSessionState(u), []);
  const refresh = useCallback(() => setSessionState(auth.session()), []);
  const login = useCallback(async (email: string, password: string) => {
    const r = await auth.login(email, password);
    if (r.ok) setSessionState(auth.session());
    return r;
  }, []);
  const register = useCallback(async (input: { name: string; email: string; password: string }) => {
    const r = await auth.register(input);
    if (r.ok) setSessionState(auth.session());
    return r;
  }, []);
  const logout = useCallback(() => {
    auth.logout();
    setSessionState(null);
  }, []);

  const value = useMemo(
    () => ({ session, refresh, setSession, login, register, logout }),
    [session, refresh, setSession, login, register, logout]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

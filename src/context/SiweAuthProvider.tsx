'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { SiweSession } from '@/lib/auth/siwe-types';
import {
  createBrowserSessionStore,
  isSessionActive,
  type SessionStore,
} from '@/lib/auth/session-store';

interface SiweAuthContextValue {
  session: SiweSession | null;
  isAuthenticated: boolean;
  address: string | null;
  /** Register the current hook-level session state with the provider. */
  setSession: (session: SiweSession | null) => void;
}

const SiweAuthContext = createContext<SiweAuthContextValue>({
  session: null,
  isAuthenticated: false,
  address: null,
  setSession: () => {},
});

export function useSiweSession(): SiweAuthContextValue {
  return useContext(SiweAuthContext);
}

export interface SiweAuthProviderProps {
  children: ReactNode;
  sessionStore?: SessionStore;
}

/**
 * App-level SIWE session boundary. Wraps the tree (no visual impact) and
 * exposes the authenticated session so consumers can gate features without
 * re-deriving it. Persists via the approved client boundary.
 */
export function SiweAuthProvider({ children, sessionStore }: SiweAuthProviderProps) {
  const store = useMemo(() => sessionStore ?? createBrowserSessionStore(), [sessionStore]);
  const [session, setSessionState] = useState<SiweSession | null>(null);

  // Hydrate from the approved boundary once on mount; drop inactive sessions.
  useEffect(() => {
    setSessionState(store.get());
  }, [store]);

  const setSession = useCallback(
    (next: SiweSession | null) => {
      if (next) {
        store.rotate(next);
      } else {
        store.clear();
      }
      setSessionState(next);
    },
    [store],
  );

  const isAuthenticated = isSessionActive(session);

  const value = useMemo<SiweAuthContextValue>(
    () => ({ session, isAuthenticated, address: session?.address ?? null, setSession }),
    [session, isAuthenticated, setSession],
  );

  return <SiweAuthContext.Provider value={value}>{children}</SiweAuthContext.Provider>;
}

'use client';

import { createContext, useContext, useState } from 'react';
import type { ApolloClient } from '@apollo/client';

import { getApolloClient as getSharedClient } from './client';

/**
 * Apollo is browser-only in this app (RSC reads stay on the server helper),
 * so a singleton client created once per provider is safe and avoids
 * re-creating the cache on every re-render. The singleton lives in
 * `client.ts` so service-layer reads can share the same cache.
 */

const ApolloClientContext = createContext<ApolloClient | null>(null);

export function ApolloProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => getSharedClient() ?? null);
  return (
    <ApolloClientContext.Provider value={client}>{children}</ApolloClientContext.Provider>
  );
}

/**
 * The browser Apollo client, or null during SSR / outside the provider.
 *
 * The Apollo cache is browser-only in this app (`getApolloClient()` returns
 * null on the server), so the context value is legitimately null during a
 * server render. Callers must treat a null as "no cache to invalidate" —
 * they already only touch the client from event handlers, which always run
 * after hydration when the client exists.
 */
export function useApollo(): ApolloClient | null {
  return useContext(ApolloClientContext);
}

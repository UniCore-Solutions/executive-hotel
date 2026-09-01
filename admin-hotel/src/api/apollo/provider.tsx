'use client';

import { useState } from 'react';
import { ApolloProvider as ApolloReactProvider, useApolloClient } from '@apollo/client/react';
import type { ApolloClient } from '@apollo/client';

import { makeApolloClient } from './client';

let singleton: ApolloClient | null = null;

export function getApolloClient(): ApolloClient {
  singleton ??= makeApolloClient();
  return singleton;
}

/** Wraps Apollo's own `ApolloProvider` (which establishes the context
    `useQuery`/`useMutation` actually read from) around a single client
    instance shared for the app's lifetime. */
export function ApolloProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(getApolloClient);
  return <ApolloReactProvider client={client}>{children}</ApolloReactProvider>;
}

/** Thin re-export so call sites (`useAdminForm`, invalidation helpers)
    don't need to know Apollo's hook name. */
export function useApollo(): ApolloClient {
  return useApolloClient();
}

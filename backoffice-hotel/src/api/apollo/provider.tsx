'use client';

import { createContext, useContext, useState } from 'react';
import type { ApolloClient } from '@apollo/client';

import { makeApolloClient } from './client';

let singleton: ApolloClient | null = null;

export function getApolloClient(): ApolloClient {
  singleton ??= makeApolloClient();
  return singleton;
}

const ApolloClientContext = createContext<ApolloClient | null>(null);

export function ApolloProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(getApolloClient);
  return (
    <ApolloClientContext.Provider value={client}>{children}</ApolloClientContext.Provider>
  );
}

export function useApollo(): ApolloClient {
  const client = useContext(ApolloClientContext);
  if (!client) {
    throw new Error('useApollo must be used inside <ApolloProvider>');
  }
  return client;
}

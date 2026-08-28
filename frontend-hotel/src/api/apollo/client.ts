'use client';

import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

/**
 * Browser-side Apollo Client — the single cache for GraphQL READ state.
 *
 * The HttpLink points at this app's own /api/graphql route handler, which
 * injects the Bearer token from the httpOnly session cookie server-side.
 * Reads that must never be stale (quote, availability, staySearch — money
 * and inventory) use `network-only`/`no-cache`; the normalized cache serves
 * the rest.
 *
 * Server components do NOT use this client: RSC reads go through
 * `services/graphqlClient.ts` (stateless, always anonymous today), so there
 * is exactly one cache and it lives in the browser.
 */

const BROWSER_GRAPHQL_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/graphql';

let singleton: ApolloClient | null = null;

/**
 * The shared browser client, created once per session. Returns null outside
 * the browser (RSC/server), where reads go through the stateless server
 * helper instead — the Apollo cache never exists server-side.
 */
export function getApolloClient(): ApolloClient | null {
  if (typeof window === 'undefined') return null;
  singleton ??= makeApolloClient();
  return singleton;
}

export function makeApolloClient(): ApolloClient {
  return new ApolloClient({
    link: new HttpLink({
      uri: BROWSER_GRAPHQL_URL,
      fetchOptions: { cache: 'no-store' },
    }),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        // The backend is the source of truth for pricing/inventory; the
        // cache only dedupes in-flight requests and serves quick re-renders.
        fetchPolicy: 'cache-first',
        nextFetchPolicy: 'cache-and-network',
      },
      query: {
        fetchPolicy: 'no-cache',
      },
    },
  });
}

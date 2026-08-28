'use client';

import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

/**
 * Browser-side Apollo Client for the back-office. Every GraphQL read goes
 * through this client, whose HttpLink points at this app's own
 * /api/graphql route handler — the BFF injects the Bearer token from the
 * httpOnly bo_session cookie, so the browser never sees the token.
 *
 * Created once per provider (singleton); the normalized cache is the single
 * read cache in this app.
 */

export function makeApolloClient(): ApolloClient {
  return new ApolloClient({
    link: new HttpLink({
      uri: '/api/graphql',
      fetchOptions: { cache: 'no-store' },
    }),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-first',
        nextFetchPolicy: 'cache-and-network',
      },
      query: {
        fetchPolicy: 'no-cache',
      },
    },
  });
}

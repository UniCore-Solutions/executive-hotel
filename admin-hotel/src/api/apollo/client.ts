'use client';

import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

/**
 * Browser-side Apollo Client. Every GraphQL read goes through this client,
 * whose HttpLink points at this app's own /api/graphql route handler — the
 * BFF injects the Bearer token from the httpOnly admin_session cookie, so
 * the browser never sees the token or the backend URL.
 */
export function makeApolloClient(): ApolloClient {
  return new ApolloClient({
    link: new HttpLink({
      uri: '/api/graphql',
      fetchOptions: { cache: 'no-store' },
    }),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            adminReservations: { keyArgs: ['hotelId', 'status'] },
            adminGuests: { keyArgs: ['hotelId', 'query'] },
            adminPayments: { keyArgs: ['hotelId'] },
            adminReviews: { keyArgs: ['hotelId', 'status'] },
          },
        },
      },
    }),
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

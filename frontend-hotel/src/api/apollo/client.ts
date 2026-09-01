'use client';

import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { GraphqlClientError } from '@/services/graphqlClient';

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

/**
 * Normalizes an error thrown by an Apollo operation into the same
 * `GraphqlClientError` the stateless client throws.
 *
 * Every other transport already does this — `gqlRequest` builds a
 * `GraphqlClientError` from the response's `errors[0].extensions.code`, and
 * `restClient` normalizes to `ApiError` in an interceptor — precisely so UI
 * code can branch on `code`. Apollo was the exception: it throws its own
 * `CombinedGraphQLErrors`, so `err instanceof GraphqlClientError` was false
 * for every browser read and callers fell through to a generic message. A
 * guest who mistyped their booking reference got "Something went wrong"
 * instead of the backend's "No reservation found for those details".
 *
 * Non-GraphQL failures (network, parse) are returned unchanged: they carry no
 * backend ErrorCode, and pretending otherwise would be worse than passing
 * them through.
 */
export function toGraphqlClientError(err: unknown): unknown {
  if (!CombinedGraphQLErrors.is(err)) return err;
  // Mirrors gqlRequest: join every message, branch on the first error's code.
  const code = err.errors[0]?.extensions?.code;
  return new GraphqlClientError(
    err.errors.map((e) => e.message).join('; '),
    typeof code === 'string' ? code : undefined
  );
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

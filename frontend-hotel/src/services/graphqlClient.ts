/** Thin GraphQL client over the backend gateway. */
import { print } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';

// Browser requests go to the same origin ("/graphql") and are proxied to the
// backend by the next.config rewrite; server-side fetches need an absolute URL.
const BROWSER_GRAPHQL_URL = process.env.NEXT_PUBLIC_API_URL ?? '/graphql';
const SERVER_GRAPHQL_URL =
  process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:8080/graphql';

export const GRAPHQL_API_URL =
  typeof window === 'undefined' ? SERVER_GRAPHQL_URL : BROWSER_GRAPHQL_URL;

export const useGraphql = process.env.NEXT_PUBLIC_USE_MOCK_SERVICES !== 'true';

export class GraphqlClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraphqlClientError';
  }
}

interface GraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function gqlRequest<TResult, TVariables>(
  document: TypedDocumentNode<TResult, TVariables>,
  variables: TVariables
): Promise<TResult> {
  const res = await fetch(GRAPHQL_API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: print(document), variables }),
    // Server-side: never cache. Build-time prerendering with an unreachable
    // backend would otherwise bake fallback content into static HTML forever.
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new GraphqlClientError(`GraphQL request failed with HTTP ${res.status}`);
  }
  const payload = (await res.json()) as GraphqlResponse<TResult>;
  if (payload.errors?.length) {
    throw new GraphqlClientError(payload.errors.map((e) => e.message).join('; '));
  }
  if (!payload.data) {
    throw new GraphqlClientError('GraphQL response contained no data');
  }
  return payload.data;
}
/** Thin GraphQL client over the backend gateway. */
import { parse, print } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';

// Browser requests go through this app's own /api/graphql route handler,
// which injects the Bearer token from the httpOnly session cookie server-side
// (the browser itself never has access to it — see lib/session.ts and
// app/api/graphql/route.ts). Server-side fetches (RSC) call the backend
// directly and are always anonymous today.
const BROWSER_GRAPHQL_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/graphql';
const SERVER_GRAPHQL_URL =
  process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:8180/graphql';

export const GRAPHQL_API_URL =
  typeof window === 'undefined' ? SERVER_GRAPHQL_URL : BROWSER_GRAPHQL_URL;

/**
 * The only currency the backend prices, persists, or charges in — the
 * product's pricing/booking/payment engine is MAD-only end to end (see
 * docs/investigations/TASK2-TASK3-CURRENCY-AND-ATOMICITY.md). The guest's
 * selected display currency (EUR/USD/GBP…) is a client-side conversion for
 * *display only* (see lib/format.ts `fmtPrice`/`convert`) and must never be
 * sent as a `currencyCode` on `quote`, `createReservation`, `createPayment`
 * or `capturePayment` — every service function that calls one of those
 * imports this constant instead of accepting currency as a parameter, so no
 * caller can leak the display selection into a transaction.
 */
export const TRANSACTION_CURRENCY = 'MAD' as const;

export class GraphqlClientError extends Error {
  /** The backend's ErrorCode extension (e.g. NOT_FOUND, VALIDATION, CONFLICT,
      UNAUTHORIZED, FORBIDDEN) — see GraphqlExceptionHandler on the backend.
      Undefined for transport-level failures (bad HTTP status, empty payload)
      that never reached a GraphQL error. */
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'GraphqlClientError';
    this.code = code;
  }
}

interface GraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

export async function gqlRequest<TResult, TVariables>(
  document: TypedDocumentNode<TResult, TVariables>,
  variables: TVariables
): Promise<TResult> {
  const query = typeof document === 'string' ? document : print(document);
  const parsed = typeof document === 'string' ? parse(query) : document;
  const opDef = parsed.definitions.find((d) => d.kind === 'OperationDefinition');
  const operationName = opDef?.kind === 'OperationDefinition' ? opDef.name?.value : undefined;
  const body: Record<string, unknown> = { query, variables };
  if (operationName) body.operationName = operationName;

  const res = await fetch(GRAPHQL_API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    // Server-side: never cache. Build-time prerendering with an unreachable
    // backend would otherwise bake fallback content into static HTML forever.
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new GraphqlClientError(`GraphQL request failed with HTTP ${res.status}`);
  }
  const payload = (await res.json()) as GraphqlResponse<TResult>;
  if (payload.errors?.length) {
    // Multiple GraphQL errors can share one response; the first error's code
    // is the one callers branch on (matches how a single field resolver
    // failure is the overwhelmingly common case for this API).
    throw new GraphqlClientError(
      payload.errors.map((e) => e.message).join('; '),
      payload.errors[0]?.extensions?.code
    );
  }
  if (!payload.data) {
    throw new GraphqlClientError('GraphQL response contained no data');
  }
  return payload.data;
}

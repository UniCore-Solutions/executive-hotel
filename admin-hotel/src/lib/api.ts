import { print } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';

export const HOTEL_API_URL = process.env.HOTEL_API_URL ?? 'http://localhost:8180/graphql';

export class ApiError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

interface GraphQlErrorBody {
  message: string;
  extensions?: { code?: string };
}

function firstGraphQlError(body: { errors?: GraphQlErrorBody[] }): Error | null {
  const err = body.errors?.[0];
  if (!err) return null;
  return new ApiError(err.message, err.extensions?.code);
}

async function parseResponse<TData>(res: Response): Promise<TData> {
  let body: { data?: TData; errors?: GraphQlErrorBody[] };
  try {
    body = (await res.json()) as { data?: TData; errors?: GraphQlErrorBody[] };
  } catch {
    throw new ApiError(`GraphQL request failed (HTTP ${res.status})`);
  }
  const apiError = firstGraphQlError(body);
  if (apiError) throw apiError;
  if (body.data === undefined) {
    throw new ApiError(`GraphQL request failed (HTTP ${res.status})`);
  }
  return body.data;
}

/** Server-side GraphQL request straight to the backend — used by the BFF
    route handlers and server components. Never call from a client component. */
export async function serverRequest<TData, TVars>(
  document: TypedDocumentNode<TData, TVars>,
  variables: TVars,
  token?: string,
): Promise<TData> {
  const res = await fetch(HOTEL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query: print(document), variables }),
    cache: 'no-store',
  });
  return parseResponse<TData>(res);
}

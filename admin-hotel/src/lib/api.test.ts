import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { ApiError, serverRequest } from './api';

const DOCUMENT = parse('query Test { hello }') as unknown as TypedDocumentNode<
  { hello: string },
  Record<string, never>
>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('ApiError', () => {
  it('carries the backend taxonomy code alongside the message', () => {
    const err = new ApiError('Rate plan not found', 'NOT_FOUND');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiError');
    expect(err.message).toBe('Rate plan not found');
    expect(err.code).toBe('NOT_FOUND');
  });

  it('allows an absent code', () => {
    expect(new ApiError('boom').code).toBeUndefined();
  });
});

describe('serverRequest / parseResponse', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the data payload on a clean 200 response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { hello: 'world' } }));
    const data = await serverRequest(DOCUMENT, {});
    expect(data).toEqual({ hello: 'world' });
  });

  it('sends an Authorization header only when a token is given', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { hello: 'world' } }));
    await serverRequest(DOCUMENT, {}, 'abc123');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc123');
  });

  it('omits the Authorization header when no token is given', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { hello: 'world' } }));
    await serverRequest(DOCUMENT, {});
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('throws an ApiError carrying the GraphQL error message and code', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ errors: [{ message: 'Hotel not found', extensions: { code: 'NOT_FOUND' } }] })
    );
    await expect(serverRequest(DOCUMENT, {})).rejects.toMatchObject({
      message: 'Hotel not found',
      code: 'NOT_FOUND',
    });
  });

  it('surfaces the first GraphQL error when several are returned', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        errors: [{ message: 'first failure' }, { message: 'second failure' }],
      })
    );
    await expect(serverRequest(DOCUMENT, {})).rejects.toMatchObject({ message: 'first failure' });
  });

  it('throws a generic ApiError when the response body has neither data nor errors', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 200));
    await expect(serverRequest(DOCUMENT, {})).rejects.toMatchObject({
      message: 'GraphQL request failed (HTTP 200)',
    });
  });

  it('throws a generic ApiError when the response body is not valid JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>502 Bad Gateway</html>', { status: 502 }));
    await expect(serverRequest(DOCUMENT, {})).rejects.toMatchObject({
      message: 'GraphQL request failed (HTTP 502)',
    });
  });
});

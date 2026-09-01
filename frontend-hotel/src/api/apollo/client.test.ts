import { describe, expect, it } from 'vitest';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { toGraphqlClientError } from './client';
import { GraphqlClientError } from '@/services/graphqlClient';

/**
 * Regression: browser reads go through Apollo, which throws its own
 * `CombinedGraphQLErrors`. Every UI error branch tests
 * `err instanceof GraphqlClientError && err.code === '…'`, so without this
 * normalization those branches were dead and guests saw a generic
 * "Something went wrong" in place of the backend's real message.
 */
describe('toGraphqlClientError', () => {
  const notFound = () =>
    new CombinedGraphQLErrors({
      data: null,
      errors: [
        {
          message:
            'No reservation found for those details. Check the reference and the email used at booking.',
          extensions: { code: 'NOT_FOUND', classification: 'NOT_FOUND' },
        },
      ],
    });

  it('converts a GraphQL error into GraphqlClientError, preserving code and message', () => {
    const out = toGraphqlClientError(notFound());
    expect(out).toBeInstanceOf(GraphqlClientError);
    const err = out as GraphqlClientError;
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe(
      'No reservation found for those details. Check the reference and the email used at booking.'
    );
  });

  it('joins multiple messages and branches on the first code, like gqlRequest', () => {
    const out = toGraphqlClientError(
      new CombinedGraphQLErrors({
        data: null,
        errors: [
          { message: 'first', extensions: { code: 'VALIDATION' } },
          { message: 'second', extensions: { code: 'CONFLICT' } },
        ],
      })
    ) as GraphqlClientError;
    expect(out.message).toBe('first; second');
    expect(out.code).toBe('VALIDATION');
  });

  it('leaves the code undefined when the backend sent no ErrorCode', () => {
    const out = toGraphqlClientError(
      new CombinedGraphQLErrors({ data: null, errors: [{ message: 'boom' }] })
    ) as GraphqlClientError;
    expect(out).toBeInstanceOf(GraphqlClientError);
    expect(out.code).toBeUndefined();
  });

  it('passes non-GraphQL failures through untouched', () => {
    // A network/parse failure carries no backend ErrorCode; dressing it up as
    // one would make callers branch on a code that was never sent.
    const network = new TypeError('Failed to fetch');
    expect(toGraphqlClientError(network)).toBe(network);
  });
});

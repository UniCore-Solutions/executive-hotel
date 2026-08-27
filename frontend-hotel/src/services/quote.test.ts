import { describe, expect, it, vi } from 'vitest';

const gqlRequest = vi.fn();
vi.mock('@/services/graphqlClient', () => ({
  gqlRequest: (...args: unknown[]) => gqlRequest(...args),
  TRANSACTION_CURRENCY: 'MAD',
}));

const { getQuote } = await import('@/services/quote');

function minimalQuote() {
  return {
    quote: {
      currencyCode: 'MAD',
      subtotalAmount: 1000,
      discountAmount: 0,
      taxAmount: 100,
      feeAmount: 0,
      totalAmount: 1100,
      originalTotal: 1100,
      valid: true,
      message: null,
      lines: [{ roomTypeId: 'rt-1', ratePlanId: 'rp-1', ratePerNight: 500, nights: 2, subtotalAmount: 1000 }],
    },
  };
}

describe('getQuote — transaction currency boundary (Task 2)', () => {
  it('always sends currencyCode "MAD" to the backend, regardless of display currency', async () => {
    gqlRequest.mockResolvedValueOnce(minimalQuote());

    await getQuote({
      hotelId: 'hotel-1',
      checkInDate: '2026-09-10',
      checkOutDate: '2026-09-12',
      adults: 2,
      children: 0,
      rooms: [{ roomTypeId: 'rt-1', ratePlanId: 'rp-1' }],
    });

    expect(gqlRequest).toHaveBeenCalledTimes(1);
    const [, variables] = gqlRequest.mock.calls[0] as [unknown, { input: { currencyCode: string } }];
    expect(variables.input.currencyCode).toBe('MAD');
  });

  it('QuoteParams has no currencyCode field to leak a display currency through', async () => {
    gqlRequest.mockResolvedValueOnce(minimalQuote());

    await getQuote({
      hotelId: 'hotel-1',
      checkInDate: '2026-09-10',
      checkOutDate: '2026-09-12',
      adults: 2,
      children: 0,
      // @ts-expect-error currencyCode was intentionally removed from
      // QuoteParams — the transaction currency is hardcoded at the service
      // boundary and can no longer be influenced by a caller.
      currencyCode: 'EUR',
      rooms: [{ roomTypeId: 'rt-1', ratePlanId: 'rp-1' }],
    });

    const [, variables] = gqlRequest.mock.calls[0] as [unknown, { input: { currencyCode: string } }];
    expect(variables.input.currencyCode).toBe('MAD');
  });
});

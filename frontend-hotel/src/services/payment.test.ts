import { describe, expect, it, vi } from 'vitest';

const gqlRequest = vi.fn();
vi.mock('@/services/graphqlClient', () => ({
  gqlRequest: (...args: unknown[]) => gqlRequest(...args),
  TRANSACTION_CURRENCY: 'MAD',
}));

const { charge } = await import('@/services/payment');

describe('charge — transaction currency + idempotency + accountless proof (Task 2 & 3)', () => {
  it('always sends currencyCode "MAD" to createPayment, and forwards idempotencyKey + guestEmail', async () => {
    gqlRequest
      .mockResolvedValueOnce({ createPayment: { id: 'pay-1', status: 'pending' } })
      .mockResolvedValueOnce({ capturePayment: { id: 'pay-1', status: 'captured' } });

    const result = await charge({
      reservationId: 'res-1',
      amount: 1100,
      card: '4111111111111112',
      idempotencyKey: 'bk-123:payment',
      guestEmail: 'guest@example.com',
    });

    expect(result.ok).toBe(true);
    expect(gqlRequest).toHaveBeenCalledTimes(2);

    const [, createVars] = gqlRequest.mock.calls[0] as [
      unknown,
      { input: { currencyCode: string; idempotencyKey: string; guestEmail?: string; reservationId: string } },
    ];
    expect(createVars.input.currencyCode).toBe('MAD');
    expect(createVars.input.idempotencyKey).toBe('bk-123:payment');
    expect(createVars.input.guestEmail).toBe('guest@example.com');
    expect(createVars.input.reservationId).toBe('res-1');

    const [, captureVars] = gqlRequest.mock.calls[1] as [
      unknown,
      { input: { paymentId: string; guestEmail?: string } },
    ];
    expect(captureVars.input.paymentId).toBe('pay-1');
    expect(captureVars.input.guestEmail).toBe('guest@example.com');
  });

  it('surfaces a non-captured status as a declined result', async () => {
    gqlRequest
      .mockResolvedValueOnce({ createPayment: { id: 'pay-2', status: 'pending' } })
      .mockResolvedValueOnce({ capturePayment: { id: 'pay-2', status: 'failed' } });

    const result = await charge({
      reservationId: 'res-2',
      amount: 500,
      card: '4111111111111112',
      idempotencyKey: 'bk-456:payment',
    });

    expect(result.ok).toBe(false);
  });
});

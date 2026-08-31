import { describe, expect, it, vi } from 'vitest';

const createPayment = vi.fn();
vi.mock('@/api/rest/endpoints', () => ({
  createPayment: (...args: unknown[]) => createPayment(...args),
}));

const { startPaymentAttempt } = await import('@/services/payment');

describe('startPaymentAttempt — REST payment creation only (asynchronous outcome, never capture)', () => {
  it('creates a payment via REST, forwarding idempotencyKey + guestEmail, and never captures it', async () => {
    createPayment.mockResolvedValue({ id: 'pay-1', status: 'pending' });

    const result = await startPaymentAttempt({
      reservationId: 'res-1',
      amount: 1100,
      idempotencyKey: 'bk-123:payment',
      guestEmail: 'guest@example.com',
    });

    expect(result).toEqual({ paymentId: 'pay-1' });
    expect(createPayment).toHaveBeenCalledTimes(1);
    expect(createPayment).toHaveBeenCalledWith({
      reservationId: 'res-1',
      amount: 1100,
      provider: 'card',
      idempotencyKey: 'bk-123:payment',
      guestEmail: 'guest@example.com',
    });
  });
});

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/graphqlClient', () => ({
  gqlRequest: vi.fn().mockRejectedValue(new Error('No backend in test')),
  TRANSACTION_CURRENCY: 'MAD',
}));

const { startPaymentAttempt } = await import('@/services/payment');

describe('payment', () => {
  it('propagates a network failure rather than swallowing it', async () => {
    await expect(
      startPaymentAttempt({
        reservationId: 'test-res',
        amount: 100,
        idempotencyKey: 'test-key',
      })
    ).rejects.toThrow();
  });
});

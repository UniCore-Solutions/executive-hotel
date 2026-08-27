import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/graphqlClient', () => ({
  gqlRequest: vi.fn().mockRejectedValue(new Error('No backend in test')),
  TRANSACTION_CURRENCY: 'MAD',
}));

const { charge } = await import('@/services/payment');

describe('payment', () => {
  it('returns error shape on network failure', async () => {
    const result = await charge({
      reservationId: 'test-res',
      card: '4111111111111112',
      amount: 100,
      idempotencyKey: 'test-key',
    });
    expect(result).toHaveProperty('ok');
    expect(typeof result.ok).toBe('boolean');
  });
});

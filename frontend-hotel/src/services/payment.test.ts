import { describe, expect, it, vi } from 'vitest';

const createPayment = vi.fn();
const capturePayment = vi.fn();
vi.mock('@/api/rest/endpoints', () => ({
  createPayment: (...args: unknown[]) => createPayment(...args),
  capturePayment: (...args: unknown[]) => capturePayment(...args),
}));

const { charge } = await import('@/services/payment');

describe('charge — REST payments: idempotency + accountless proof (API rule: writes via REST)', () => {
  it('creates then captures via REST, forwarding idempotencyKey + guestEmail', async () => {
    createPayment.mockResolvedValue({ id: 'pay-1', status: 'pending' });
    capturePayment.mockResolvedValue({ id: 'pay-1', status: 'captured' });

    const result = await charge({
      reservationId: 'res-1',
      amount: 1100,
      card: '4111111111111112',
      idempotencyKey: 'bk-123:payment',
      guestEmail: 'guest@example.com',
    });

    expect(result.ok).toBe(true);
    expect(createPayment).toHaveBeenCalledTimes(1);
    expect(capturePayment).toHaveBeenCalledTimes(1);

    expect(createPayment).toHaveBeenCalledWith({
      reservationId: 'res-1',
      amount: 1100,
      provider: 'card',
      idempotencyKey: 'bk-123:payment',
      guestEmail: 'guest@example.com',
    });
    expect(capturePayment).toHaveBeenCalledWith({
      paymentId: 'pay-1',
      guestEmail: 'guest@example.com',
    });
  });

  it('surfaces a non-captured status as a declined result', async () => {
    createPayment.mockResolvedValue({ id: 'pay-2', status: 'pending' });
    capturePayment.mockResolvedValue({ id: 'pay-2', status: 'failed' });

    const result = await charge({
      reservationId: 'res-2',
      amount: 500,
      card: '4111111111111112',
      idempotencyKey: 'bk-456:payment',
    });

    expect(result.ok).toBe(false);
  });
});

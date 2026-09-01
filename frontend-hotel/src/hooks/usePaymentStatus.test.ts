import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { GraphqlClientError } from '@/services/graphqlClient';
import type { BackendReservation } from '@/services/reservations';

const find = vi.fn();
vi.mock('@/services/reservations', () => ({
  reservations: { find: (...args: unknown[]) => find(...args) },
}));

const { usePaymentStatus } = await import('@/hooks/usePaymentStatus');

function reservation(paymentStatus: string): BackendReservation {
  return { reference: 'RC-ABC123', paymentStatus } as unknown as BackendReservation;
}

describe('usePaymentStatus', () => {
  it('confirms once the backend reports the payment captured', async () => {
    find.mockResolvedValue(reservation('captured'));
    const { result } = renderHook(() => usePaymentStatus('RC-ABC123', 'g@example.com', true));
    await waitFor(() => expect(result.current.phase).toBe('confirmed'));
  });

  it('reports a failed payment', async () => {
    find.mockResolvedValue(reservation('failed'));
    const { result } = renderHook(() => usePaymentStatus('RC-ABC123', 'g@example.com', true));
    await waitFor(() => expect(result.current.phase).toBe('failed'));
  });

  /* Regression: a miss used to be swallowed as a transient read failure, so a
     wrong reference left the guest on a spinner until the 2-minute ceiling
     instead of being told the lookup failed. */
  it('stops immediately on NOT_FOUND and surfaces the backend message', async () => {
    find.mockRejectedValue(
      new GraphqlClientError('No reservation found for those details.', 'NOT_FOUND')
    );
    const { result } = renderHook(() => usePaymentStatus('RC-NOPE9', 'g@example.com', true));
    await waitFor(() => expect(result.current.phase).toBe('error'));
    expect(result.current).toMatchObject({
      phase: 'error',
      message: 'No reservation found for those details.',
    });
    expect(find).toHaveBeenCalledTimes(1);
  });

  it('keeps polling through a transient failure', async () => {
    find
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(reservation('captured'));
    const { result } = renderHook(() => usePaymentStatus('RC-ABC123', 'g@example.com', true));
    // Still processing after the blip, then confirmed once the retry lands.
    await waitFor(() => expect(result.current.phase).toBe('confirmed'), { timeout: 5000 });
    expect(find.mock.calls.length).toBeGreaterThan(1);
  });

  it('stays idle when disabled', async () => {
    find.mockResolvedValue(reservation('captured'));
    const { result } = renderHook(() => usePaymentStatus('RC-ABC123', 'g@example.com', false));
    expect(result.current.phase).toBe('processing');
    expect(find).not.toHaveBeenCalled();
  });
});

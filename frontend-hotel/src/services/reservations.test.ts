import { describe, expect, it, vi } from 'vitest';
import { bookingKey, generateIdempotencyKey } from '@/services/reservations';

describe('generateIdempotencyKey', () => {
  it('generates unique keys with bk- prefix', () => {
    const k1 = generateIdempotencyKey();
    const k2 = generateIdempotencyKey();
    expect(k1).toMatch(/^bk-/);
    expect(k2).toMatch(/^bk-/);
    expect(k1).not.toBe(k2);
  });
});

describe('bookingKey', () => {
  it('begin returns a fresh key', () => {
    const item = 'room:double-or-twin:double-or-twin::bb:2026-09-12:2026-09-16';
    const { key } = bookingKey.begin(item);
    expect(key).toMatch(/^bk-/);
  });

  it('get returns current state', () => {
    const item = 'room:x::bb:2026-01-01:2026-01-03';
    bookingKey.begin(item);
    const state = bookingKey.get();
    expect(state.item).toBe(item);
    expect(state.finished).toBe(false);
  });

  it('clearDone resets finished flag', () => {
    const item = 'room:y::bb:2026-01-01:2026-01-03';
    bookingKey.begin(item);
    bookingKey.finish();
    bookingKey.clearDone();
    expect(bookingKey.get().finished).toBe(false);
  });
});

describe('reservations.create — REST write with MAD-only transaction currency (API rule)', () => {
  it('always sends currencyCode "MAD" to createReservation, never a display currency', async () => {
    vi.resetModules();
    const post = vi.fn().mockResolvedValue({
      status: 201,
      data: { id: 'res-1', reference: 'RC-TEST01' },
    });
    vi.doMock('@/api/rest/client', () => ({
      restClient: { post },
      ApiError: class ApiError extends Error {},
    }));

    const { createReservation } = await import('@/api/rest/endpoints');
    await createReservation({
      hotelId: 'hotel-1',
      checkInDate: '2026-09-10',
      checkOutDate: '2026-09-12',
      adults: 2,
      children: 0,
      guest: { firstName: 'A', lastName: 'B', email: 'a@example.com' },
      rooms: [{ roomTypeId: 'rt-1', ratePlanId: 'rp-1' }],
      idempotencyKey: 'bk-test-key',
    });

    expect(post).toHaveBeenCalledTimes(1);
    const [url, body, config] = post.mock.calls[0] as [
      string,
      Record<string, unknown>,
      { headers: Record<string, string> },
    ];
    expect(url).toBe('/v1/reservations');
    expect(body.currencyCode).toBe('MAD');
    expect(body.idempotencyKey).toBe('bk-test-key');
    expect(config.headers['Idempotency-Key']).toBe('bk-test-key');

    vi.doUnmock('@/api/rest/client');
    vi.resetModules();
  });
});

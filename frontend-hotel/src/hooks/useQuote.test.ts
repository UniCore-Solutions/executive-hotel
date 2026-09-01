import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { Room, RatePlan } from '@/types';
import type { UseQuoteArgs } from '@/hooks/useQuote';

const getQuote = vi.fn();
const mapQuoteExtraLines: (...args: unknown[]) => unknown[] = vi.fn(() => []);
vi.mock('@/services/quote', () => ({
  getQuote: (...args: unknown[]) => getQuote(...args),
  mapQuoteExtraLines: (...args: unknown[]) => mapQuoteExtraLines(...args),
}));

const { useQuote } = await import('@/hooks/useQuote');

const room: Room = {
  id: 'room-1',
  name: 'Superior',
  images: [],
  description: '',
  capacity: { adults: 2, children: 1 },
  bed: '',
  size: '',
  category: 'standard',
  amenities: [],
  pricePerNight: 1000,
  cancellationPolicy: '',
  availability: 'available',
  importantInfo: [],
  hotelId: 'hotel-1',
};

const plan: RatePlan = {
  id: 'room-1::bb',
  backendRatePlanId: 'rp-1',
  name: 'Bed & Breakfast',
  mealPlan: '',
  price: 1000,
  cancellationPolicy: '',
  benefits: [],
  freeCancellation: true,
};

function baseArgs(overrides: Partial<UseQuoteArgs> = {}): UseQuoteArgs {
  return {
    room,
    hotelId: 'hotel-1',
    plan,
    hasDates: true,
    checkin: new Date(2026, 8, 10),
    checkout: new Date(2026, 8, 12),
    adults: 2,
    children: 0,
    rooms: 1,
    promo: '',
    extrasSel: [],
    extrasList: [],
    ...overrides,
  };
}

describe('useQuote', () => {
  it('does not fetch and returns no quote/error when there are no dates', () => {
    getQuote.mockClear();
    const { result } = renderHook(() => useQuote(baseArgs({ hasDates: false, checkin: null, checkout: null })));
    expect(getQuote).not.toHaveBeenCalled();
    expect(result.current.quote).toBeNull();
    expect(result.current.quoteError).toBe('');
  });

  it('fetches a quote once dates/room/plan are known and exposes the breakdown', async () => {
    getQuote.mockReset();
    getQuote.mockResolvedValue({
      quote: { perNight: 1000, nights: 2, rooms: 1, roomSubtotal: 2000, discount: 0, taxedBase: 2000, taxes: 200, extrasTotal: 0, total: 2200, originalTotal: 2200 },
      raw: { valid: true, message: null, extras: [] },
    });

    const { result } = renderHook(() => useQuote(baseArgs()));

    await waitFor(() => expect(result.current.quote).not.toBeNull());
    expect(result.current.quote?.total).toBe(2200);
    expect(result.current.quoteError).toBe('');
    expect(getQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        hotelId: 'hotel-1',
        rooms: [{ roomTypeId: 'room-1', ratePlanId: 'rp-1' }],
      })
    );
  });

  it('surfaces the backend message when the quote is invalid, without a quote', async () => {
    getQuote.mockReset();
    getQuote.mockResolvedValue({
      quote: {} ,
      raw: { valid: false, message: 'No price configured for these dates.', extras: [] },
    });

    const { result } = renderHook(() => useQuote(baseArgs()));

    await waitFor(() => expect(result.current.quoteError).toBe('No price configured for these dates.'));
    expect(result.current.quote).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { bookingURL, hotelRoomURL, hotelURL, roomURL, searchURL } from '@/lib/links';
import { getDefaultState } from '@/lib/dates';

function fullState() {
  const s = getDefaultState();
  s.checkin = new Date(2026, 8, 12);
  s.checkout = new Date(2026, 8, 16);
  s.children = 2;
  s.childrenAges = [4, 9];
  s.promo = 'summer2026';
  s.currency = 'EUR';
  return s;
}

const STAY_QUERY = 'checkin=2026-09-12&checkout=2026-09-16&adults=2&children=2&ages=4%2C9&rooms=1&promo=summer2026&cur=EUR';

describe('searchURL', () => {
  it('builds /search from stay state', () => {
    expect(searchURL(fullState())).toBe(`/search?${STAY_QUERY}`);
  });

  it('appends extra params', () => {
    expect(searchURL(fullState(), { utm_source: 'google' })).toBe(
      `/search?${STAY_QUERY}&utm_source=google`
    );
  });
});

describe('roomURL', () => {
  it('carries roomId plus stay state, no plan', () => {
    expect(roomURL(fullState(), '42')).toBe(`/hotel?roomId=42&${STAY_QUERY}`);
  });

  it('adds plan when provided', () => {
    expect(roomURL(fullState(), '42', 'plan-1')).toBe(
      `/hotel?roomId=42&${STAY_QUERY}&plan=plan-1`
    );
  });

  it('adds plan and extra params', () => {
    expect(roomURL(fullState(), '42', 'plan-1', { src: 'home' })).toBe(
      `/hotel?roomId=42&${STAY_QUERY}&plan=plan-1&src=home`
    );
  });

  it('skips empty extra values', () => {
    expect(roomURL(fullState(), '42', undefined, { src: '' })).toBe(
      `/hotel?roomId=42&${STAY_QUERY}`
    );
  });
});

describe('hotelURL', () => {
  it('builds /hotel?hotelid=', () => {
    expect(hotelURL('7')).toBe('/hotel?hotelid=7');
  });
});

describe('hotelRoomURL', () => {
  it('carries hotelId, roomId and stay state, no plan', () => {
    expect(hotelRoomURL(fullState(), '7', '42')).toBe(`/hotel?hotelid=7&roomId=42&${STAY_QUERY}`);
  });

  it('adds plan and extra params', () => {
    expect(hotelRoomURL(fullState(), '7', '42', 'plan-1', { src: 'home' })).toBe(
      `/hotel?hotelid=7&roomId=42&${STAY_QUERY}&plan=plan-1&src=home`
    );
  });
});

describe('bookingURL', () => {
  it('builds /booking with room and stay state', () => {
    expect(bookingURL(fullState(), '42')).toBe(`/booking?${STAY_QUERY}&room=42`);
  });

  it('adds plan when provided', () => {
    expect(bookingURL(fullState(), '42', 'plan-1')).toBe(
      `/booking?${STAY_QUERY}&room=42&plan=plan-1`
    );
  });

  it('adds plan and extra params', () => {
    expect(bookingURL(fullState(), '42', 'plan-1', { src: 'home' })).toBe(
      `/booking?${STAY_QUERY}&room=42&plan=plan-1&src=home`
    );
  });
});

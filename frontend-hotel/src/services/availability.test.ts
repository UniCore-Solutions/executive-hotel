import { describe, expect, it } from 'vitest';
import { demandFor, filterEntries, fitsGuests } from '@/services/availability';
import { emptyFilters } from '@/lib/filters';
import { PROPERTY } from '@/test/fixtures/hotel';

describe('fitsGuests', () => {
  it('matches capacity rules', () => {
    const room = PROPERTY.rooms[0]!; // 2 adults / 1 child
    expect(fitsGuests(room, 2, 1)).toBe(true);
    expect(fitsGuests(room, 3, 0)).toBe(false);
    expect(fitsGuests(room, 1, 2)).toBe(false);
  });
});

describe('demandFor', () => {
  it('returns a stable integer 0–999', () => {
    const d = demandFor(PROPERTY.rooms[0]!);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThan(1000);
    expect(demandFor(PROPERTY.rooms[0]!)).toBe(d);
  });
});

describe('filterEntries', () => {
  const rooms = PROPERTY.rooms;
  const entries = rooms.map((room) => ({
    room,
    availability: 'available' as const,
    plans: [
      {
        id: `${room.id}::bb`,
        backendRatePlanId: '00000000-0000-0000-0000-000000000011',
        name: 'Bed & Breakfast',
        mealPlan: 'Breakfast included',
        price: room.pricePerNight,
        cancellationPolicy: room.cancellationPolicy,
        benefits: [],
        freeCancellation: true,
        paymentTiming: 'prepay_full' as const,
      },
    ],
    demand: 0,
    fits: true,
  }));

  it('returns the set unchanged when no facets are active', () => {
    expect(filterEntries(entries, emptyFilters())).toEqual(entries);
  });

  it('filters by room category', () => {
    const suites = filterEntries(entries, { ...emptyFilters(), cat: ['suite'] });
    expect(suites.map((e) => e.room.id)).toEqual(['executive-suite']);
  });

  it('filters by price bracket on the lowest plan price', () => {
    const cheap = filterEntries(entries, { ...emptyFilters(), price: ['under-1000'] });
    expect(cheap.map((e) => e.room.id).sort()).toEqual(['double-or-twin']);
    const top = filterEntries(entries, { ...emptyFilters(), price: ['1500-plus'] });
    expect(top.map((e) => e.room.id)).toEqual(['executive-suite']);
  });

  it('filters by amenity (terrace is suite-only)', () => {
    const terrace = filterEntries(entries, { ...emptyFilters(), amenities: ['terrace'] });
    expect(terrace.map((e) => e.room.id)).toEqual(['executive-suite']);
  });

  it('combines facets with AND semantics', () => {
    const out = filterEntries(entries, {
      ...emptyFilters(),
      cat: ['suite'],
      amenities: ['terrace'],
    });
    expect(out.map((e) => e.room.id)).toEqual(['executive-suite']);
  });

  it('yields an empty set when no room satisfies the facets', () => {
    const out = filterEntries(entries, {
      ...emptyFilters(),
      cat: ['suite'],
      price: ['under-1000'],
    });
    expect(out).toEqual([]);
  });
});

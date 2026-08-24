import { describe, expect, it } from 'vitest';
import {
  availabilityFor,
  filterEntries,
  fitsGuests,
  getStay,
  getStayRoom,
  plansFor,
  searchRooms,
} from '@/services/availability';
import { emptyFilters } from '@/lib/filters';
import { PROPERTY } from '@/data';

const CI = new Date(2026, 8, 12);

describe('availabilityFor', () => {
  it('is deterministic per room+date and falls in the 0–100 band', () => {
    const a = availabilityFor(PROPERTY.rooms[0]!, '2026-09-12');
    expect(a).toBe(availabilityFor(PROPERTY.rooms[0]!, '2026-09-12'));
    expect(['available', 'soldout', 'few']).toContain(a);
  });

  it('hard-soldout rooms stay soldout', () => {
    const soldout = { ...PROPERTY.rooms[0]!, availability: 'soldout' as const };
    expect(availabilityFor(soldout, '2026-09-12')).toBe('soldout');
  });
});

describe('fitsGuests', () => {
  it('matches capacity rules', () => {
    const room = PROPERTY.rooms[0]!; // 2 adults / 1 child
    expect(fitsGuests(room, 2, 1)).toBe(true);
    expect(fitsGuests(room, 3, 0)).toBe(false);
    expect(fitsGuests(room, 1, 2)).toBe(false);
  });
});

describe('searchRooms', () => {
  it('returns only fitting, non-soldout rooms with plans and demand', async () => {
    const entries = await searchRooms({ checkin: CI, adults: 2, children: 0 });
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.availability).toBeDefined();
      expect(e.plans.length).toBeGreaterThan(0);
      expect(e.demand).toBeGreaterThanOrEqual(0);
      expect(e.demand).toBeLessThan(1000);
      expect(fitsGuests(e.room, 2, 0)).toBe(true);
    }
  });

  it('large parties shrink the result set', async () => {
    const big = await searchRooms({ checkin: CI, adults: 6, children: 3 });
    expect(big.length).toBe(0);
  });
});

describe('getStayRoom', () => {
  it('returns the room, plans, fit flag and siblings', async () => {
    const out = await getStayRoom('', 'executive-suite', { checkin: CI, adults: 2, children: 1 });
    expect(out?.room.id).toBe('executive-suite');
    expect(out?.fits).toBe(true);
    expect(out?.siblingRooms.length).toBe(2);
    expect(out?.siblingRooms.every((s) => s.room.id !== 'executive-suite')).toBe(true);
    expect(out?.plans.some((p) => p.id === 'executive-suite::hb')).toBe(true);
  });

  it('returns null for unknown rooms', async () => {
    expect(await getStayRoom('', 'nope', {})).toBeNull();
  });
});

describe('filterEntries', () => {
  const rooms = PROPERTY.rooms;
  const entries = rooms.map((room) => ({
    room,
    availability: availabilityFor(room, '2026-09-12'),
    plans: plansFor(room),
    demand: 0,
  }));

  it('returns the set unchanged when no facets are active', () => {
    expect(filterEntries(entries, emptyFilters())).toEqual(entries);
  });

  it('filters by room category', () => {
    const suites = filterEntries(entries, { ...emptyFilters(), cat: ['suite'] });
    expect(suites.map((e) => e.room.id)).toEqual(['executive-suite']);
  });

  it('filters by meal plan (half board exists only for rooms >= 950)', () => {
    const hb = filterEntries(entries, { ...emptyFilters(), plans: ['hb'] });
    expect(hb.map((e) => e.room.id).sort()).toEqual(['executive-suite', 'superior-double-or-twin']);
  });

  it('filters by refundability via any plan', () => {
    const free = filterEntries(entries, { ...emptyFilters(), refund: ['free'] });
    const nonrefund = filterEntries(entries, { ...emptyFilters(), refund: ['nonrefund'] });
    expect(free.map((e) => e.room.id)).toEqual(entries.map((e) => e.room.id));
    expect(nonrefund.map((e) => e.room.id)).toEqual(entries.map((e) => e.room.id));
  });

  it('filters by price bracket on the lowest plan price', () => {
    const cheap = filterEntries(entries, { ...emptyFilters(), price: ['under-1000'] });
    expect(cheap.map((e) => e.room.id).sort()).toEqual([
      'double-or-twin',
      'superior-double-or-twin',
    ]);
    const top = filterEntries(entries, { ...emptyFilters(), price: ['1500-plus'] });
    expect(top.map((e) => e.room.id)).toEqual([]);
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

describe('getStay / plansFor', () => {
  it('getStay lists every room with availability', async () => {
    const out = await getStay('', { checkin: CI, adults: 2, children: 0 });
    expect(out?.hotel.id).toBe('executive-boutique-rabat');
    expect(out?.rooms.length).toBe(3);
  });

  it('plan ids follow room::suffix convention', () => {
    const ids = plansFor(PROPERTY.rooms[0]!).map((p) => p.id);
    expect(ids).toEqual([
      'superior-double-or-twin::bb',
      'superior-double-or-twin::ro',
      'superior-double-or-twin::hb',
    ]);
  });
});

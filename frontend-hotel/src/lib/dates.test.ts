import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  dateLabel,
  fromISODate,
  getDefaultState,
  guestsLabel,
  hashStr,
  nightsBetween,
  parseNum,
  readStateFromURL,
  round10,
  startOfDay,
  stateToParams,
  toISODate,
  validateState,
} from '@/lib/dates';

describe('hashStr (FNV-1a 32)', () => {
  it('is deterministic and uses the FNV offset basis for the empty string', () => {
    expect(hashStr('')).toBe(2166136261);
    expect(hashStr('superior-double-or-twin|2026-09-12')).toBe(
      hashStr('superior-double-or-twin|2026-09-12')
    );
    expect(hashStr('a')).not.toBe(hashStr('b'));
  });
});

describe('round10', () => {
  it('rounds to nearest 10 with a 1 floor', () => {
    expect(round10(892.5)).toBe(890);
    expect(round10(1050 * 0.85)).toBe(890);
    expect(round10(1050 * 1.12)).toBe(1180);
    expect(round10(0.4)).toBe(1);
  });
});

describe('date math', () => {
  it('startOfDay/addDays/addMonths are local and DST-safe', () => {
    const d = new Date(2026, 2, 15, 18, 30);
    expect(toISODate(startOfDay(d))).toBe('2026-03-15');
    expect(toISODate(addDays(d, 3))).toBe('2026-03-18');
    expect(toISODate(addMonths(d, 1))).toBe('2026-04-01');
  });

  it('nightsBetween counts whole nights', () => {
    const a = new Date(2026, 6, 4);
    const b = new Date(2026, 6, 8);
    expect(nightsBetween(a, b)).toBe(4);
  });

  it('fromISODate parses local dates; malformed input returns null', () => {
    expect(toISODate(fromISODate('2026-09-12')!)).toBe('2026-09-12');
    expect(fromISODate('garbage')).toBeNull();
    expect(fromISODate('2026-9-2')).toBeNull();
  });
});

describe('URL state', () => {
  it('defaults', () => {
    const s = readStateFromURL(new URLSearchParams());
    expect(s.checkin).toBeNull();
    expect(s.checkout).toBeNull();
    expect(s.adults).toBe(2);
    expect(s.children).toBe(0);
    expect(s.childrenAges).toEqual([]);
    expect(s.rooms).toBe(1);
    expect(s.promo).toBe('');
    expect(s.currency).toBe('MAD');
  });

  it('round-trips a full state via stateToParams', () => {
    const s = readStateFromURL(
      new URLSearchParams(
        'checkin=2026-09-12&checkout=2026-09-16&adults=2&children=2&ages=4,9&rooms=1&promo=summer2026&cur=eur'
      )
    );
    expect(toISODate(s.checkin!)).toBe('2026-09-12');
    expect(toISODate(s.checkout!)).toBe('2026-09-16');
    expect(s.promo).toBe('SUMMER2026');
    expect(s.currency).toBe('EUR');
    expect(s.childrenAges).toEqual([4, 9]);
    const p = stateToParams(s);
    expect(p.get('checkin')).toBe('2026-09-12');
    expect(p.get('checkout')).toBe('2026-09-16');
    expect(p.get('adults')).toBe('2');
    expect(p.get('children')).toBe('2');
    expect(p.get('ages')).toBe('4,9');
    expect(p.get('promo')).toBe('SUMMER2026');
    expect(p.get('cur')).toBe('EUR');
  });

  it('drops checkin before today and checkout not after checkin', () => {
    const past = startOfDay(new Date(new Date().setDate(new Date().getDate() - 30)));
    const s = readStateFromURL(
      new URLSearchParams(`checkin=${toISODate(past)}&checkout=2026-09-16`)
    );
    expect(s.checkin).toBeNull();
    expect(s.checkout).toBeNull();
  });

  it('clamps counts and filters ages', () => {
    const s = readStateFromURL(new URLSearchParams('adults=0&children=99&ages=4,9,25&rooms=0'));
    expect(s.adults).toBe(1);
    expect(s.children).toBe(6);
    expect(s.rooms).toBe(1);
    expect(s.childrenAges).toEqual([4, 9]);
  });

  it('rejects unknown currencies and invalid dates', () => {
    const s = readStateFromURL(new URLSearchParams('cur=JPY&checkin=not-a-date'));
    expect(s.currency).toBe('MAD');
    expect(s.checkin).toBeNull();
  });

  it('only serializes ages when children > 0', () => {
    expect(stateToParams(getDefaultState()).has('ages')).toBe(false);
  });
});

describe('validateState', () => {
  it('exact reference messages', () => {
    const s = getDefaultState();
    expect(validateState(s)).toEqual(['Please choose your check-in and check-out dates.']);
    s.checkin = new Date(2026, 8, 12);
    s.checkout = new Date(2026, 8, 10);
    expect(validateState(s)).toEqual(['Check-out must be after check-in.']);
    s.checkout = new Date(2026, 8, 16);
    s.children = 2;
    s.childrenAges = [4];
    expect(validateState(s)).toEqual(['Please select an age for each child.']);
    s.childrenAges = [4, 9];
    s.rooms = 2;
    s.adults = 1;
    expect(validateState(s)).toEqual(['Please assign at least one adult per room.']);
    s.adults = 3;
    expect(validateState(s)).toEqual([]);
  });
});

describe('labels', () => {
  it('guestsLabel and dateLabel formats (reference style)', () => {
    expect(guestsLabel({ adults: 2, children: 1, rooms: 1 })).toBe('2 adults · 1 child · 1 room');
    expect(guestsLabel({ adults: 1, children: 3, rooms: 2 })).toBe(
      '1 adult · 3 children · 2 rooms'
    );
    const s = { checkin: new Date(2026, 8, 12), checkout: new Date(2026, 8, 16) };
    expect(dateLabel(s)).toBe('Sep 12 – Sep 16 · 4 nights');
    expect(dateLabel({ checkin: null, checkout: null })).toBe('Select dates');
  });
});

describe('parseNum', () => {
  it('falls back and clamps', () => {
    expect(parseNum('abc', 2, 1, 9)).toBe(2);
    expect(parseNum('0', 2, 1, 9)).toBe(1);
    expect(parseNum('99', 2, 1, 9)).toBe(9);
    expect(parseNum('4', 2, 1, 9)).toBe(4);
  });
});

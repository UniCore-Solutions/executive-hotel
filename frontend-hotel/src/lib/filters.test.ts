import { describe, expect, it } from 'vitest';
import {
  amenityOptions,
  emptyFilters,
  filterCount,
  filtersActive,
  filtersToParams,
  parseFilters,
  priceBracketMatch,
} from '@/lib/filters';

describe('parseFilters', () => {
  it('reads comma-separated facets from f_* params', () => {
    const f = parseFilters(
      new URLSearchParams('f_price=under-1000,1000-1499&f_plans=bb,hb&f_refund=free')
    );
    expect(f.price).toEqual(['under-1000', '1000-1499']);
    expect(f.plans).toEqual(['bb', 'hb']);
    expect(f.refund).toEqual(['free']);
    expect(f.cat).toEqual([]);
    expect(f.amenities).toEqual([]);
  });

  it('normalizes case and drops unknown values', () => {
    const f = parseFilters(new URLSearchParams('f_plans=BB,xx&f_cat=SUITE,bogus'));
    expect(f.plans).toEqual(['bb']);
    expect(f.cat).toEqual(['suite']);
  });

  it('amenities are not validated against the static allowlist', () => {
    const f = parseFilters(new URLSearchParams('f_am=Terrace, Free%20Wi-Fi'));
    expect(f.amenities).toEqual(['terrace', 'free wi-fi']);
  });

  it('empty params produce an empty filter set', () => {
    expect(parseFilters(new URLSearchParams())).toEqual(emptyFilters());
  });
});

describe('filtersToParams / filtersActive / filterCount', () => {
  it('serializes only non-empty facets', () => {
    const p = filtersToParams({ ...emptyFilters(), plans: ['bb'], cat: ['suite'] });
    expect(p.toString()).toBe('f_plans=bb&f_cat=suite');
  });

  it('round-trips through parse', () => {
    const f = { ...emptyFilters(), price: ['1500-plus'], amenities: ['terrace'] };
    expect(parseFilters(filtersToParams(f))).toEqual(f);
  });

  it('filtersActive and filterCount reflect selections', () => {
    expect(filtersActive(emptyFilters())).toBe(false);
    expect(filtersActive({ ...emptyFilters(), refund: ['free'] })).toBe(true);
    expect(filterCount({ ...emptyFilters(), plans: ['bb', 'hb'], cat: ['suite'] })).toBe(3);
  });
});

describe('priceBracketMatch', () => {
  it('brackets cover the MAD per-night price', () => {
    expect(priceBracketMatch('under-1000', 780)).toBe(true);
    expect(priceBracketMatch('under-1000', 999)).toBe(true);
    expect(priceBracketMatch('under-1000', 1000)).toBe(false);
    expect(priceBracketMatch('1000-1499', 1320)).toBe(true);
    expect(priceBracketMatch('1500-plus', 1550)).toBe(true);
    expect(priceBracketMatch('1500-plus', 1499)).toBe(false);
    expect(priceBracketMatch('nope', 500)).toBe(false);
  });
});

describe('amenityOptions', () => {
  it('only returns amenities that differentiate the set', () => {
    const rooms = [{ amenities: ['Terrace', 'Free Wi-Fi'] }, { amenities: ['Free Wi-Fi'] }];
    expect(amenityOptions(rooms)).toEqual(['terrace']);
  });

  it('returns nothing when every room shares the amenity', () => {
    const rooms = [{ amenities: ['Free Wi-Fi'] }, { amenities: ['Free Wi-Fi'] }];
    expect(amenityOptions(rooms)).toEqual([]);
  });

  it('handles an empty set', () => {
    expect(amenityOptions([])).toEqual([]);
  });
});

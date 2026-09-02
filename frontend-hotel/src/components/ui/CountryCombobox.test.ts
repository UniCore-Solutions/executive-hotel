import { describe, expect, it } from 'vitest';
import { matchRank } from './CountryCombobox';

const MA = { code: 'MA', name: 'Morocco', callingCode: '212' };
const MG = { code: 'MG', name: 'Madagascar', callingCode: '261' };
const GB = { code: 'GB', name: 'United Kingdom', callingCode: '44' };
const PG = { code: 'PG', name: 'Papua New Guinea', callingCode: '675' };
const AQ = { code: 'AQ', name: 'Antarctica', callingCode: null };

const ranked = (q: string, list = [MA, MG, GB, PG, AQ]) =>
  list
    .map((c) => ({ c, rank: matchRank(c, q) }))
    .filter((m) => m.rank > 0)
    .sort((a, b) => b.rank - a.rank || a.c.name.localeCompare(b.c.name))
    .map((m) => m.c.code);

describe('matchRank', () => {
  /* Regression: the calling-code clause stripped non-digits from the query,
     so a letters-only search compared against "" — which every dial code
     contains — and the list returned all 245 countries unfiltered. */
  it('does not match every country on a letters-only query', () => {
    expect(ranked('mor')).toEqual(['MA']);
    expect(matchRank(GB, 'mor')).toBe(0);
    expect(matchRank(AQ, 'mor')).toBe(0);
  });

  it('searches by country name', () => {
    expect(ranked('united')).toEqual(['GB']);
    expect(ranked('madagascar')).toEqual(['MG']);
  });

  it('searches by ISO code, ranking an exact code first', () => {
    expect(ranked('ma')).toEqual(['MA', 'MG']);
    expect(ranked('gb')).toEqual(['GB']);
  });

  it('searches by dial code, with and without the plus', () => {
    expect(ranked('212')).toEqual(['MA']);
    expect(ranked('+212')).toEqual(['MA']);
    /* Equal-rank prefix hits fall back to alphabetical order. */
    expect(ranked('+2')).toEqual(['MG', 'MA']);
  });

  it('ignores names for a digits-only query, and dial codes for a text query', () => {
    /* A row with no calling code can never answer a dial-code search... */
    expect(matchRank(AQ, '44')).toBe(0);
    expect(matchRank(MA, '212')).toBeGreaterThan(0);
    /* ...and once the query contains a letter it is read as a name/ISO
       search, so the digits in it are not matched against dial codes. */
    expect(matchRank(MG, 'ma212')).toBe(0);
  });

  it('prefers a word-start hit over a mid-word one', () => {
    expect(matchRank(PG, 'guinea')).toBeGreaterThan(matchRank(PG, 'ew'));
  });

  it('does not throw on regex metacharacters in the query', () => {
    expect(() => matchRank(MA, 'mo(ro')).not.toThrow();
    expect(matchRank(MA, 'mo(ro')).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { computeDayStatus, emptyDayCell } from './dayStatus';

describe('computeDayStatus', () => {
  it('is soldout when nothing is free', () => {
    expect(computeDayStatus(0, 10)).toBe('soldout');
  });

  it('is soldout for a negative free count (over-committed)', () => {
    expect(computeDayStatus(-1, 10)).toBe('soldout');
  });

  it('is few when 1 or 2 units remain and some inventory has sold', () => {
    expect(computeDayStatus(1, 10)).toBe('few');
    expect(computeDayStatus(2, 10)).toBe('few');
  });

  it('is available when untouched, even for a tiny room type', () => {
    // total === free (nothing sold/blocked yet) is never "few", even at 1-2 units.
    expect(computeDayStatus(2, 2)).toBe('available');
    expect(computeDayStatus(1, 1)).toBe('available');
  });

  it('is available above the scarcity threshold', () => {
    expect(computeDayStatus(3, 10)).toBe('available');
  });
});

describe('emptyDayCell', () => {
  it('defaults to fully available with zero sold/blocked/out-of-order', () => {
    const cell = emptyDayCell('2026-09-05', 8);
    expect(cell).toEqual({
      date: '2026-09-05',
      total: 8,
      roomsSold: 0,
      outOfOrder: 0,
      blocked: 0,
      free: 8,
      status: 'available',
    });
  });
});

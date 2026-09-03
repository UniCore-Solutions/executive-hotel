import { describe, expect, it } from 'vitest';
import { availabilityRangeSchema } from './availability';

const base = {
  roomTypeId: 'rt-1',
  fromDate: '2026-09-10',
  toDate: '2026-09-12',
  blocked: 0,
  outOfOrder: 0,
};

describe('availabilityRangeSchema', () => {
  it('accepts a valid range', () => {
    expect(availabilityRangeSchema.safeParse(base).success).toBe(true);
  });

  it('accepts a single-day range (toDate === fromDate)', () => {
    const result = availabilityRangeSchema.safeParse({ ...base, toDate: base.fromDate });
    expect(result.success).toBe(true);
  });

  it('rejects an end date before the start date', () => {
    const result = availabilityRangeSchema.safeParse({
      ...base,
      fromDate: '2026-09-12',
      toDate: '2026-09-10',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['toDate']);
      expect(result.error.issues[0]?.message).toBe('End date must be on or after the start date');
    }
  });

  it('rejects a missing room type', () => {
    expect(availabilityRangeSchema.safeParse({ ...base, roomTypeId: '' }).success).toBe(false);
  });

  it('rejects a negative blocked count', () => {
    expect(availabilityRangeSchema.safeParse({ ...base, blocked: -1 }).success).toBe(false);
  });

  it('rejects a blocked count above 999', () => {
    expect(availabilityRangeSchema.safeParse({ ...base, blocked: 1000 }).success).toBe(false);
  });

  it('rejects a non-integer count', () => {
    expect(availabilityRangeSchema.safeParse({ ...base, outOfOrder: 2.5 }).success).toBe(false);
  });
});

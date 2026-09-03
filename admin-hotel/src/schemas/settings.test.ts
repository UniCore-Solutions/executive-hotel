import { describe, expect, it } from 'vitest';
import { HOTEL_CURRENCIES, hotelPoliciesSchema, hotelProfileSchema } from './settings';

describe('hotelProfileSchema', () => {
  const base = {
    name: 'Executive Hotel',
    defaultCurrency: 'MAD' as const,
    status: 'active' as const,
  };

  it('accepts the minimal valid shape (all optional fields omitted)', () => {
    expect(hotelProfileSchema.safeParse(base).success).toBe(true);
  });

  it('accepts a well-formed email', () => {
    expect(hotelProfileSchema.safeParse({ ...base, email: 'front-desk@hotel.test' }).success).toBe(
      true
    );
  });

  it('accepts an empty string email as "not set"', () => {
    expect(hotelProfileSchema.safeParse({ ...base, email: '' }).success).toBe(true);
  });

  it('rejects a malformed, non-empty email', () => {
    expect(hotelProfileSchema.safeParse({ ...base, email: 'nope' }).success).toBe(false);
  });

  it('accepts HH:mm check-in/out times', () => {
    expect(hotelProfileSchema.safeParse({ ...base, checkInTime: '14:00' }).success).toBe(true);
    expect(hotelProfileSchema.safeParse({ ...base, checkOutTime: '23:59' }).success).toBe(true);
  });

  it('accepts an empty string for check-in/out time as "not set"', () => {
    expect(hotelProfileSchema.safeParse({ ...base, checkInTime: '' }).success).toBe(true);
  });

  it('rejects an out-of-range hour or a missing leading zero', () => {
    expect(hotelProfileSchema.safeParse({ ...base, checkInTime: '25:00' }).success).toBe(false);
    expect(hotelProfileSchema.safeParse({ ...base, checkInTime: '9:30' }).success).toBe(false);
  });

  it('rejects latitude/longitude outside real-world bounds', () => {
    expect(hotelProfileSchema.safeParse({ ...base, latitude: 91 }).success).toBe(false);
    expect(hotelProfileSchema.safeParse({ ...base, longitude: -181 }).success).toBe(false);
  });

  it('rejects a star rating outside 1-5', () => {
    expect(hotelProfileSchema.safeParse({ ...base, starRating: 0 }).success).toBe(false);
    expect(hotelProfileSchema.safeParse({ ...base, starRating: 6 }).success).toBe(false);
  });

  it('rejects a currency outside the hardcoded reference list', () => {
    expect(hotelProfileSchema.safeParse({ ...base, defaultCurrency: 'JPY' }).success).toBe(false);
  });
});

describe('HOTEL_CURRENCIES', () => {
  it('has one entry per supported currency, each with a value and a label', () => {
    expect(HOTEL_CURRENCIES).toHaveLength(6);
    for (const currency of HOTEL_CURRENCIES) {
      expect(currency.value.length).toBe(3);
      expect(currency.label.length).toBeGreaterThan(0);
    }
  });
});

describe('hotelPoliciesSchema', () => {
  it('accepts an empty policy list', () => {
    expect(hotelPoliciesSchema.safeParse({ policies: [] }).success).toBe(true);
  });

  it('accepts a well-formed policy row', () => {
    expect(
      hotelPoliciesSchema.safeParse({
        policies: [{ name: 'Check-in', value: 'From 14:00' }],
      }).success
    ).toBe(true);
  });

  it('rejects a policy row missing a name or value', () => {
    expect(
      hotelPoliciesSchema.safeParse({ policies: [{ name: '', value: 'From 14:00' }] }).success
    ).toBe(false);
    expect(
      hotelPoliciesSchema.safeParse({ policies: [{ name: 'Check-in', value: '' }] }).success
    ).toBe(false);
  });

  it('rejects more than 50 policy rows', () => {
    const policies = Array.from({ length: 51 }, (_, i) => ({ name: `P${i}`, value: 'v' }));
    expect(hotelPoliciesSchema.safeParse({ policies }).success).toBe(false);
  });
});

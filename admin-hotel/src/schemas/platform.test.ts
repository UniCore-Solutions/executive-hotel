import { describe, expect, it } from 'vitest';
import { HOTEL_CURRENCIES } from './settings';
import { PLATFORM_CURRENCIES, platformBrandSchema, platformContactSchema } from './platform';

describe('platformBrandSchema', () => {
  const base = {
    name: 'Executive Hotel Collection',
    defaultCurrency: 'MAD' as const,
    status: 'active' as const,
  };

  it('accepts the minimal valid shape', () => {
    expect(platformBrandSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a one-character name', () => {
    expect(platformBrandSchema.safeParse({ ...base, name: 'A' }).success).toBe(false);
  });

  it('rejects a currency outside the hardcoded reference list', () => {
    expect(platformBrandSchema.safeParse({ ...base, defaultCurrency: 'JPY' }).success).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(platformBrandSchema.safeParse({ ...base, status: 'archived' }).success).toBe(false);
  });
});

describe('platformContactSchema', () => {
  it('accepts a well-formed email', () => {
    expect(platformContactSchema.safeParse({ contactEmail: 'ops@example.com' }).success).toBe(true);
  });

  it('accepts an empty string as "no email set", not a validation error', () => {
    // Radix Select/inputs can't carry `undefined` cleanly, so the form
    // clears this field to '' rather than omitting it.
    expect(platformContactSchema.safeParse({ contactEmail: '' }).success).toBe(true);
  });

  it('rejects a malformed, non-empty email', () => {
    expect(platformContactSchema.safeParse({ contactEmail: 'not-an-email' }).success).toBe(false);
  });

  it('accepts omitting both fields entirely', () => {
    expect(platformContactSchema.safeParse({}).success).toBe(true);
  });

  it('rejects a phone number over 50 characters', () => {
    expect(platformContactSchema.safeParse({ contactPhone: '0'.repeat(51) }).success).toBe(false);
  });
});

describe('PLATFORM_CURRENCIES', () => {
  // Locks in that the platform brand form and the per-hotel profile form
  // (schemas/settings.ts) can never silently drift onto two different
  // hardcoded currency lists — both are backend gaps (no `currencies` query
  // exists yet), so keeping them as one shared list is the only thing
  // preventing that split.
  it('is the exact same list as HOTEL_CURRENCIES, not an independent copy', () => {
    expect(PLATFORM_CURRENCIES).toBe(HOTEL_CURRENCIES);
  });
});

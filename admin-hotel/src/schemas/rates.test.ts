import { describe, expect, it } from 'vitest';
import { ratePlanPriceRowSchema, ratePlanSchema } from './rates';

describe('ratePlanSchema', () => {
  const base = {
    name: 'Bed & Breakfast Flex',
    code: 'BB_FLEX',
    currencyCode: 'MAD',
    isRefundable: true,
    cancellationPenaltyType: 'none' as const,
    paymentTiming: 'pay_at_property' as const,
    status: 'active' as const,
  };

  it('accepts the minimal valid shape', () => {
    expect(ratePlanSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a code with spaces or symbols outside [A-Za-z0-9_-]', () => {
    expect(ratePlanSchema.safeParse({ ...base, code: 'BB FLEX' }).success).toBe(false);
    expect(ratePlanSchema.safeParse({ ...base, code: 'BB@FLEX' }).success).toBe(false);
  });

  it('accepts a code with letters, digits, hyphens and underscores', () => {
    expect(ratePlanSchema.safeParse({ ...base, code: 'BB-Flex_2' }).success).toBe(true);
  });

  it('uppercases a lowercase currency code on parse', () => {
    const result = ratePlanSchema.safeParse({ ...base, currencyCode: 'mad' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currencyCode).toBe('MAD');
    }
  });

  it('rejects a currency code that is not exactly 3 letters', () => {
    expect(ratePlanSchema.safeParse({ ...base, currencyCode: 'MADX' }).success).toBe(false);
    expect(ratePlanSchema.safeParse({ ...base, currencyCode: 'MA' }).success).toBe(false);
  });

  it('rejects an unrecognized cancellation penalty type', () => {
    expect(ratePlanSchema.safeParse({ ...base, cancellationPenaltyType: 'refundable' }).success).toBe(
      false
    );
  });

  it('accepts the "none" penalty-type sentinel used for "not configured"', () => {
    expect(ratePlanSchema.safeParse({ ...base, cancellationPenaltyType: 'none' }).success).toBe(true);
  });

  it('rejects an unrecognized payment timing', () => {
    expect(ratePlanSchema.safeParse({ ...base, paymentTiming: 'invoice_later' }).success).toBe(false);
  });

  it('has no "draft" status, unlike room types and hotels — rate plans are only active/inactive', () => {
    expect(ratePlanSchema.safeParse({ ...base, status: 'active' }).success).toBe(true);
    expect(ratePlanSchema.safeParse({ ...base, status: 'inactive' }).success).toBe(true);
    expect(ratePlanSchema.safeParse({ ...base, status: 'draft' }).success).toBe(false);
  });

  it('rejects a deposit percentage above 100', () => {
    expect(ratePlanSchema.safeParse({ ...base, depositPercentage: 101 }).success).toBe(false);
  });

  it('rejects minStay/maxStay of zero (must be at least 1 night)', () => {
    expect(ratePlanSchema.safeParse({ ...base, minStay: 0 }).success).toBe(false);
    expect(ratePlanSchema.safeParse({ ...base, maxStay: 0 }).success).toBe(false);
  });
});

describe('ratePlanPriceRowSchema', () => {
  const base = { validFrom: '2026-09-01', validTo: '2026-12-31', priceAmount: 1200 };

  it('accepts a valid price row', () => {
    expect(ratePlanPriceRowSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a zero price', () => {
    expect(ratePlanPriceRowSchema.safeParse({ ...base, priceAmount: 0 }).success).toBe(false);
  });

  it('rejects a negative price', () => {
    expect(ratePlanPriceRowSchema.safeParse({ ...base, priceAmount: -50 }).success).toBe(false);
  });

  it('rejects a missing validFrom/validTo', () => {
    expect(ratePlanPriceRowSchema.safeParse({ ...base, validFrom: '' }).success).toBe(false);
    expect(ratePlanPriceRowSchema.safeParse({ ...base, validTo: '' }).success).toBe(false);
  });
});

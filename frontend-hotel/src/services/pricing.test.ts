import { describe, expect, it, beforeAll } from 'vitest';
import { setOffersSource, validatePromo } from '@/services/pricing';
import { DATA } from '@/data';
import type { PromoCtx } from '@/services/pricing';

beforeAll(() => {
  setOffersSource(DATA.OFFERS);
});

const ctx = (planId: string, nights = 4, checkin: Date | null = ci): PromoCtx => ({
  nights,
  planId,
  checkin,
});

const ci = new Date(2026, 8, 12); // 2026-09-12 (within SUMMER2026 stay window)

describe('validatePromo', () => {
  it('empty / unknown codes — exact messages', () => {
    expect(validatePromo('', ctx('r::bb'))).toMatchObject({
      valid: false,
      message: 'Enter a promo code to check it.',
    });
    expect(validatePromo('NOPE', ctx('r::bb'))).toMatchObject({
      valid: false,
      message: '“NOPE” is not a valid promo code. Check the code and try again.',
    });
  });

  it('SUMMER2026 happy path on bb/hb', () => {
    const r = validatePromo('summer2026', ctx('r::bb'));
    expect(r).toMatchObject({
      valid: true,
      code: 'SUMMER2026',
      message: 'Early Bird Savings — −10% applied.',
    });
    expect(validatePromo('SUMMER2026', ctx('r::hb')).valid).toBe(true);
  });

  it('SUMMER2026 rejects short stays, wrong plan, out-of-window dates', () => {
    expect(validatePromo('SUMMER2026', ctx('r::bb', 1)).message).toBe(
      'Early Bird Savings (SUMMER2026) needs a stay of at least 2 nights.'
    );
    expect(validatePromo('SUMMER2026', ctx('r::ro')).message).toBe(
      'Early Bird Savings (SUMMER2026) is not available on this rate plan. Eligible: bb, hb.'
    );
    expect(validatePromo('SUMMER2026', ctx('r::bb', 4, new Date(2026, 10, 20))).message).toBe(
      'Early Bird Savings (SUMMER2026) applies to stays between 2026-06-01 and 2026-10-31.'
    );
  });

  it('BESTRATE only on ro', () => {
    expect(validatePromo('BESTRATE', ctx('r::ro')).valid).toBe(true);
    expect(validatePromo('BESTRATE', ctx('r::bb')).valid).toBe(false);
  });

  it('STAY4PAY3 needs 4 nights', () => {
    expect(validatePromo('STAY4PAY3', ctx('r::bb', 4)).valid).toBe(true);
    expect(validatePromo('STAY4PAY3', ctx('r::bb', 3)).message).toContain(
      'needs a stay of at least 4 nights'
    );
  });
});

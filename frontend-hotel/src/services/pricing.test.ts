import { describe, expect, it } from 'vitest';
import {
  compute,
  forRoomAndPlan,
  promoDiscount,
  taxesRate,
  validatePromo,
} from '@/services/pricing';
import { plansFor } from '@/services/availability';
import { PROPERTY } from '@/data';

const ci = new Date(2026, 8, 12); // 2026-09-12 (within SUMMER2026 stay window)

const ctx = (planId: string, nights = 4, promo = '', checkin: Date | null = ci) => ({
  perNight: 1050,
  nights,
  rooms: 1,
  promo,
  planId,
  checkin,
});

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
    expect(validatePromo('SUMMER2026', ctx('r::bb', 4, '', new Date(2026, 10, 20))).message).toBe(
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

describe('compute', () => {
  it('base math with 12% tax', () => {
    const b = compute(ctx('executive-suite::bb', 4));
    expect(b.roomSubtotal).toBe(4200);
    expect(b.discount).toBe(0);
    expect(b.taxedBase).toBe(4200);
    expect(b.taxes).toBe(504);
    expect(b.total).toBe(4704);
    expect(b.originalTotal).toBe(4704);
    expect(taxesRate).toBe(0.12);
  });

  it('percent promo discount then tax on the discounted base', () => {
    const b = compute(ctx('executive-suite::bb', 4, 'SUMMER2026'));
    expect(b.discount).toBe(420);
    expect(b.taxedBase).toBe(3780);
    expect(b.taxes).toBe(454);
    expect(b.total).toBe(4234);
    // reference: originalTotal recomputed from roomSubtotal with promo taxes
    expect(b.originalTotal).toBe(4654);
    expect(b.promo).toMatchObject({ valid: true, code: 'SUMMER2026' });
  });

  it('night-free promo: 4th night free = one night', () => {
    const b = compute(ctx('executive-suite::bb', 8, 'STAY4PAY3'));
    expect(b.discount).toBe(1050 * 2);
    expect(b.roomSubtotal).toBe(1050 * 8);
  });

  it('extras add at face value', () => {
    const b = compute({ ...ctx('r::bb'), extras: [{ id: 'airport-shuttle', qty: 1 }] });
    expect(b.extrasTotal).toBe(250);
  });

  it('invalid promo adds nothing', () => {
    const b = compute(ctx('r::bb', 4, 'NOPE'));
    expect(b.discount).toBe(0);
    expect(b.promo?.message).toContain('not a valid promo code');
  });
});

describe('promoDiscount + plans + forRoomAndPlan', () => {
  it('plan prices follow ro −15% / hb +12% rounding', () => {
    const plans = plansFor(PROPERTY.rooms[0]!);
    const byPlan = Object.fromEntries(plans.map((p) => [p.id.split('::')[1], p.price]));
    expect(byPlan).toEqual({ bb: 1050, ro: 890, hb: 1180 });
  });

  it('no hb for rooms under 950 MAD', () => {
    const plans = plansFor(PROPERTY.rooms[1]!);
    expect(plans.map((p) => p.id.split('::')[1])).toEqual(['bb', 'ro']);
  });

  it('night promoDiscount needs at least the offer period', () => {
    const ok = validatePromo('STAY4PAY3', ctx('r::bb', 4));
    expect(promoDiscount(ok, 1050, 4, 1)).toBe(1050);
    const short = validatePromo('STAY4PAY3', ctx('r::bb', 3));
    expect(promoDiscount(short, 1050, 3, 1)).toBe(0);
  });

  it('forRoomAndPlan honors promo + nights', () => {
    const plans = plansFor(PROPERTY.rooms[0]!);
    const b = forRoomAndPlan(PROPERTY.rooms[0]!, plans[0]!, {
      perNight: plans[0]!.price,
      nights: 2,
      rooms: 1,
      promo: 'SUMMER2026',
      planId: plans[0]!.id,
      checkin: ci,
    });
    expect(b.discount).toBe(210);
  });
});

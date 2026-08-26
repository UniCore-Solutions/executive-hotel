/** Promo validation + shared promo sources. Pricing math lives in the backend
    quote engine (`quote.ts`); this module only validates a promo code against the
    hydrated offer catalog for client-side hints. */
import type { Offer, PromoResult } from '@/types';
import { toISODate } from '@/lib/dates';

export interface PromoCtx {
  nights: number;
  checkin?: Date | string | null;
  planId: string;
}

/** Backend offer catalog injected at runtime via ensurePricingSources(). Empty by
    default so stale fixture data can never be used if the backend fails to hydrate. */
let offersSource: Offer[] = [];

export function setOffersSource(list: Offer[]): void {
  offersSource = list;
}

export function validatePromo(code: string, ctx: PromoCtx, today: Date = new Date()): PromoResult {
  const c = String(code || '')
    .trim()
    .toUpperCase();
  if (!c)
    return { valid: false, code: '', offer: null, message: 'Enter a promo code to check it.' };
  const offer = offersSource.find((o) => o.code === c);
  if (!offer)
    return {
      valid: false,
      code: c,
      offer: null,
      message: `“${c}” is not a valid promo code. Check the code and try again.`,
    };

  const nights = ctx.nights || 0;
  const checkin = ctx.checkin ? toISODate(ctx.checkin) : '';
  const plan = String(ctx.planId || '').split('::')[1] || 'bb';
  const todayIso = toISODate(today);

  if (nights < offer.minNights) {
    return {
      valid: false,
      code: c,
      offer,
      message: `${offer.title} (${c}) needs a stay of at least ${offer.minNights} ${offer.minNights === 1 ? 'night' : 'nights'}.`,
    };
  }
  if (todayIso < offer.bookingWindow.from || todayIso > offer.bookingWindow.to) {
    return {
      valid: false,
      code: c,
      offer,
      message: `${offer.title} (${c}) is only valid for bookings made ${offer.bookingWindow.from} → ${offer.bookingWindow.to}.`,
    };
  }
  if (!checkin || checkin < offer.stayWindow.from || checkin > offer.stayWindow.to) {
    return {
      valid: false,
      code: c,
      offer,
      message: `${offer.title} (${c}) applies to stays between ${offer.stayWindow.from} and ${offer.stayWindow.to}.`,
    };
  }
  if (!offer.eligiblePlans.includes(plan)) {
    return {
      valid: false,
      code: c,
      offer,
      message: `${offer.title} (${c}) is not available on this rate plan. Eligible: ${offer.eligiblePlans.join(', ')}.`,
    };
  }
  return { valid: true, code: c, offer, message: `${offer.title} — ${offer.badge} applied.` };
}

export function offerById(code: string): Offer | undefined {
  return offersSource.find(
    (o) =>
      o.code ===
      String(code || '')
        .trim()
        .toUpperCase()
  );
}

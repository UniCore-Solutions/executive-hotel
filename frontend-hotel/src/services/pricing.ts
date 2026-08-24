/** Pricing + promo engine — faithful port of RC.pricing (mock.js), exact messages. */
import { DATA } from '@/data';
import type { Offer, PriceBreakdown, PromoResult, RatePlan } from '@/types';
import { toISODate } from '@/lib/dates';

export const taxesRate = 0.12;

export interface PromoCtx {
  nights: number;
  checkin?: Date | string | null;
  planId: string;
}

/** Price sources — backend catalogs are injected at runtime; the static
    fixture remains the default so pure-mock mode and tests stay deterministic. */
let offersSource: Offer[] = DATA.OFFERS;
let extrasCatalog: typeof DATA.EXTRAS = DATA.EXTRAS;

export function setOffersSource(list: Offer[]): void {
  if (list.length) offersSource = list;
}

export function setExtrasCatalog(list: typeof DATA.EXTRAS): void {
  if (list.length) extrasCatalog = list;
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

export function promoDiscount(
  result: PromoResult | null,
  perNight: number,
  nights: number,
  rooms: number
): number {
  if (!result || !result.valid) return 0;
  const { offer } = result;
  const roomSubtotal = perNight * nights * rooms;
  if (offer!.discount.type === 'percent') {
    return Math.round((roomSubtotal * offer!.discount.value) / 100);
  }
  if (offer!.discount.type === 'night') {
    const { every, free } = offer!.discount;
    const freeNights = Math.floor(nights / every) * free;
    if (freeNights < 1) return 0;
    return perNight * Math.min(freeNights, nights) * rooms;
  }
  return 0;
}

export interface ComputeCtx {
  perNight: number;
  nights: number;
  rooms?: number;
  extras?: Array<{ id: string; qty: number }>;
  /** Per-extra price lookup preferred over the static fixture (backend ids). */
  extraPrices?: Record<string, number>;
  promo?: string;
  planId: string;
  checkin?: Date | string | null;
}

export function compute(ctx: ComputeCtx): PriceBreakdown {
  const perNight = Math.max(0, ctx.perNight || 0);
  const nights = Math.max(0, ctx.nights || 0);
  const rooms = Math.max(1, parseInt(String(ctx.rooms), 10) || 1);
  const extras = Array.isArray(ctx.extras) ? ctx.extras : [];

  const promo = validatePromo(ctx.promo || '', {
    nights,
    checkin: ctx.checkin,
    planId: ctx.planId,
  });
  const roomSubtotal = perNight * nights * rooms;
  const discount = promo.valid ? promoDiscount(promo, perNight, nights, rooms) : 0;
  const taxedBase = Math.max(0, roomSubtotal - discount);
  const taxes = Math.round(taxedBase * taxesRate);

  const extrasTotal = extras.reduce((sum, e) => {
    const override = ctx.extraPrices?.[e.id];
    const x =
      override !== undefined
        ? { price: override }
        : (extrasCatalog.find((ex) => ex.id === e.id) ?? null);
    return sum + (x ? x.price * (parseInt(String(e.qty), 10) || 0) : 0);
  }, 0);

  return {
    perNight,
    nights,
    rooms,
    roomSubtotal,
    discount,
    promo,
    taxedBase,
    taxes,
    extrasTotal,
    total: taxedBase + taxes + extrasTotal,
    originalTotal: roomSubtotal + taxes + extrasTotal,
  };
}

/** Price context for a room+plan (no extras). */
export function forRoomAndPlan(
  room: { pricePerNight: number },
  plan: RatePlan,
  ctx: ComputeCtx
): PriceBreakdown {
  return compute({
    perNight: plan.price,
    nights: ctx.nights,
    rooms: ctx.rooms,
    extras: [],
    promo: ctx.promo,
    planId: plan.id,
    checkin: ctx.checkin,
  });
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

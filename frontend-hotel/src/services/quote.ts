/** Backend quote service — calls the server-side pricing engine. */
import { QuoteDocument, type QuoteQuery } from '@/graphql/generated/graphql';
import type { PriceBreakdown } from '@/types';
import { gqlRequest } from './graphqlClient';
import { toISODate } from '@/lib/dates';

type BackendQuote = QuoteQuery['quote'];

export interface QuoteParams {
  hotelId: string;
  checkInDate: Date | string;
  checkOutDate: Date | string;
  adults: number;
  children: number;
  currencyCode: string;
  rooms: Array<{ roomTypeId: string; ratePlanId: string }>;
  extras?: Array<{ extraId: string; quantity: number }>;
  promoCode?: string;
}

function toISO(d: Date | string): string {
  return typeof d === 'string' ? d : toISODate(d);
}

/** Call the backend quote engine and map the result to a PriceBreakdown. */
export async function getQuote(params: QuoteParams): Promise<{
  quote: PriceBreakdown;
  raw: BackendQuote;
}> {
  const { quote: raw } = await gqlRequest(QuoteDocument, {
    input: {
      hotelId: params.hotelId,
      checkInDate: toISO(params.checkInDate),
      checkOutDate: toISO(params.checkOutDate),
      adults: params.adults,
      children: params.children,
      currencyCode: params.currencyCode,
      rooms: params.rooms,
      extras: params.extras,
      promoCode: params.promoCode || null,
    },
  });

  const roomSubtotal = raw.lines.reduce((sum, l) => sum + l.subtotalAmount, 0);
  const first = raw.lines[0];
  const perNight = first?.ratePerNight ?? 0;
  const nights = first?.nights ?? 0;
  const extrasTotal = Math.max(0, raw.subtotalAmount - roomSubtotal);
  const taxedBase = Math.max(0, raw.subtotalAmount - raw.discountAmount);

  const breakdown: PriceBreakdown = {
    perNight,
    nights,
    rooms: params.rooms.length || 1,
    roomSubtotal,
    discount: raw.discountAmount,
    taxedBase,
    taxes: raw.taxAmount,
    extrasTotal,
    total: raw.totalAmount,
    originalTotal: raw.originalTotal,
    currency: raw.currencyCode,
  };

  return { quote: breakdown, raw };
}

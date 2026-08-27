/** Backend quote service — calls the server-side pricing engine.
    Transaction currency is always MAD (see TRANSACTION_CURRENCY in
    graphqlClient.ts) — the display currency the guest picks never reaches
    this call; useCurrency().fmt() converts the MAD result for display only. */
import { QuoteDocument, type QuoteQuery } from '@/graphql/generated/graphql';
import type { Extra, PriceBreakdown, QuoteExtraLine } from '@/types';
import { gqlRequest, TRANSACTION_CURRENCY } from './graphqlClient';
import { toISODate } from '@/lib/dates';

type BackendQuote = QuoteQuery['quote'];

export interface QuoteParams {
  hotelId: string;
  checkInDate: Date | string;
  checkOutDate: Date | string;
  adults: number;
  children: number;
  rooms: Array<{ roomTypeId: string; ratePlanId: string }>;
  extras?: Array<{ extraId: string; quantity: number }>;
  promoCode?: string;
}

function toISO(d: Date | string): string {
  return typeof d === 'string' ? d : toISODate(d);
}

/** Joins the backend's itemized extras (quantity/unit/total price — the
    priced-per-model amounts, e.g. per_night × nights) against the caller's
    already-loaded extras catalog for display names, so QuoteTable can
    itemize instead of showing one aggregate line. Pricing math itself always
    stays server-computed — this only attaches the name. */
export function mapQuoteExtraLines(
  rawExtras: BackendQuote['extras'],
  catalog: Extra[]
): QuoteExtraLine[] {
  return rawExtras.map((line) => ({
    extraId: line.extraId,
    name: catalog.find((e) => e.id === line.extraId)?.name ?? 'Extra',
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    totalPrice: line.totalPrice,
  }));
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
      currencyCode: TRANSACTION_CURRENCY,
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
  const taxAmount = raw.taxAmount ?? 0;
  const feeAmount = raw.feeAmount ?? 0;
  const taxRate = taxedBase > 0 ? (taxAmount + feeAmount) / taxedBase : 0;

  const breakdown: PriceBreakdown = {
    perNight,
    nights,
    rooms: params.rooms.length || 1,
    roomSubtotal,
    discount: raw.discountAmount,
    taxedBase,
    taxes: taxAmount + feeAmount,
    taxAmount,
    feeAmount,
    taxRate,
    extrasTotal,
    total: raw.totalAmount,
    originalTotal: raw.originalTotal,
    currency: raw.currencyCode,
  };

  return { quote: breakdown, raw };
}

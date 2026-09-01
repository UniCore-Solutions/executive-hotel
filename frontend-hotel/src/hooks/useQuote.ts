/** Server-priced quote for a room + stay + extras selection. The booking
    card uses the same backend engine as the booking page, so room and
    checkout totals always agree — there is deliberately no local
    fixture-based pricing fallback.

    When there are no dates there is deliberately NO price placeholder: a
    server quote is the only legitimate total, and a locally-computed number
    (even "per night x nights") would look like a real price. Callers should
    show an explicit "select dates" state instead when `hasDates` is false. */
'use client';

import { useEffect, useRef, useState } from 'react';
import { getQuote, mapQuoteExtraLines } from '@/services/quote';
import { GraphqlClientError } from '@/services/graphqlClient';
import type { Extra, PriceBreakdown, RatePlan, Room } from '@/types';
import type { ExtraSelection } from '@/lib/extras';

export interface UseQuoteArgs {
  room: Room | null;
  hotelId: string | undefined;
  plan: RatePlan | undefined;
  hasDates: boolean;
  checkin: Date | null;
  checkout: Date | null;
  adults: number;
  children: number;
  rooms: number;
  promo: string;
  extrasSel: ExtraSelection;
  extrasList: Extra[];
}

export function useQuote(
  args: UseQuoteArgs
): { quote: PriceBreakdown | null; quoteError: string; loading: boolean } {
  const {
    room,
    hotelId,
    plan,
    hasDates,
    checkin,
    checkout,
    adults,
    children,
    rooms,
    promo,
    extrasSel,
    extrasList,
  } = args;

  const [quoteState, setQuoteState] = useState<{
    quote: PriceBreakdown | null;
    loading: boolean;
    error: string;
  }>({ quote: null, loading: false, error: '' });
  const quoteReqId = useRef(0);

  useEffect(() => {
    if (!plan || !hasDates || !checkin || !checkout || !room) return;
    const reqId = ++quoteReqId.current;
    getQuote({
      hotelId: room.hotelId ?? hotelId ?? '',
      checkInDate: checkin,
      checkOutDate: checkout,
      adults: adults || 2,
      children: children || 0,
      rooms: [{ roomTypeId: room.id, ratePlanId: plan.backendRatePlanId }],
      extras: extrasSel.map((x) => ({ extraId: x.id, quantity: x.qty })),
      promoCode: promo || undefined,
    })
      .then((result) => {
        if (reqId !== quoteReqId.current) return;
        if (result.raw.valid) {
          setQuoteState({
            quote: { ...result.quote, extras: mapQuoteExtraLines(result.raw.extras, extrasList) },
            loading: false,
            error: '',
          });
        } else {
          setQuoteState({
            quote: null,
            loading: false,
            error: result.raw.message || 'Invalid request — adjust dates or extras.',
          });
        }
      })
      .catch((err) => {
        if (reqId !== quoteReqId.current) return;
        // VALIDATION/CONFLICT here mean the request itself is wrong (e.g. no
        // price configured for these dates) — retrying won't help, so the
        // backend's specific message is more useful than a generic one.
        const message =
          err instanceof GraphqlClientError && (err.code === 'VALIDATION' || err.code === 'CONFLICT')
            ? err.message
            : 'Could not calculate price — please try again.';
        setQuoteState({ quote: null, loading: false, error: message });
      });
  }, [plan, hasDates, checkin, checkout, adults, children, rooms, promo, extrasSel, extrasList, room, hotelId]);

  return {
    quote: hasDates ? quoteState.quote : null,
    quoteError: hasDates ? quoteState.error : '',
    loading: quoteState.loading,
  };
}

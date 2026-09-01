/** Extras catalog + the guest's current extras selection for a room page.
    Loads the hotel's real extras catalog once `hotelId` is known and seeds
    pricing sources (promos) alongside it — mirrors the shape of
    usePaymentStatus.ts: a small hook owning one cohesive slice of state and
    the effect(s) that keep it in sync with the backend. */
'use client';

import { useEffect, useState } from 'react';
import { getExtras } from '@/services/extras';
import { ensurePricingSources } from '@/services/pricingHydration';
import { parseExtrasParam, type ExtraSelection } from '@/lib/extras';
import type { Extra } from '@/types';

export function useExtrasSelection(hotelId: string | undefined, initialExtras: string) {
  const [extrasSel, setExtrasSel] = useState<ExtraSelection>(() =>
    parseExtrasParam(initialExtras)
  );
  const [extrasList, setExtrasList] = useState<Extra[]>([]);

  useEffect(() => {
    if (!hotelId) return;
    let alive = true;
    getExtras(hotelId).then((list) => alive && setExtrasList(list));
    ensurePricingSources();
    return () => {
      alive = false;
    };
  }, [hotelId]);

  return { extrasSel, setExtrasSel, extrasList };
}

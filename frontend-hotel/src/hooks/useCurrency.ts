/** Currency hook — currency lives in the search state / URL (reference: RC.state.currency). */
'use client';

import { useCallback } from 'react';
import { useSearch } from '@/context/SearchContext';
import { fmtPrice, CURRENCY_INFO } from '@/lib/format';
import type { CurrencyCode } from '@/types';

export function useCurrency() {
  const { state, setCurrency } = useSearch();
  const currency = state.currency;

  const fmt = useCallback(
    (mad: number, opts?: { perNight?: boolean }) => fmtPrice(mad, currency, opts),
    [currency]
  );
  const info = (code?: string) =>
    CURRENCY_INFO.find((c) => c.code === (code || currency)) ?? CURRENCY_INFO[0];

  return {
    currency,
    setCurrency,
    fmt,
    info,
    currencies: CURRENCY_INFO,
    setCode: (c: CurrencyCode) => setCurrency(c),
  };
}

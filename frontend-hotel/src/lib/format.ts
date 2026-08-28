/** FX + price display (ports of RC.fx and RC.fmtPrice — mock.js/common.js).
    One FX table for the whole app: rates come from the NEXT_PUBLIC_FX_* env
    vars (baked at build time; .env.example documents the values) and are
    DISPLAY-ONLY — the backend prices and persists in MAD only. */
import type { CurrencyCode } from '@/types';

export const FX: Record<CurrencyCode, number> = {
  MAD: 1,
  EUR: Number.parseFloat(process.env.NEXT_PUBLIC_FX_EUR ?? '0.091'),
  USD: Number.parseFloat(process.env.NEXT_PUBLIC_FX_USD ?? '0.100'),
  GBP: Number.parseFloat(process.env.NEXT_PUBLIC_FX_GBP ?? '0.078'),
};
export const CURRENCIES: CurrencyCode[] = ['MAD', 'EUR', 'USD', 'GBP'];

export const CURRENCY_INFO: Array<{ code: CurrencyCode; symbol: string; label: string }> = [
  { code: 'MAD', symbol: 'MAD', label: 'Moroccan Dirham' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
];

export function isValidCurrency(c: string): boolean {
  return (CURRENCIES as string[]).includes(c);
}

export function convert(mad: number, cur: CurrencyCode = 'MAD'): number {
  return Math.round((mad || 0) * (FX[cur] || 1));
}

export function symbol(cur: CurrencyCode = 'MAD'): string {
  return ({ MAD: 'MAD', EUR: '€', USD: '$', GBP: '£' } as Record<CurrencyCode, string>)[cur] || cur;
}

export function currencyInfo(code: string): { code: CurrencyCode; symbol: string; label: string } {
  return (
    CURRENCY_INFO.find((c) => c.code === code) ?? {
      code: 'MAD',
      symbol: 'MAD',
      label: 'Moroccan Dirham',
    }
  );
}

/** Format a MAD amount in the selected display currency via Intl. */
export function fmtMad(mad: number, cur: CurrencyCode = 'MAD'): string {
  const converted = convert(mad, cur);
  const code = cur === 'MAD' ? 'MAD' : cur;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(converted);
  } catch {
    return `${converted.toLocaleString('en-US')} ${code}`;
  }
}

/** RC.fmtPrice — display currency aware wrapper. */
export function fmtPrice(
  mad: number,
  currency: CurrencyCode = 'MAD',
  opts: { perNight?: boolean } = {}
): string {
  const s = fmtMad(mad, currency);
  return opts.perNight ? `${s}/night` : s;
}

const PRICE_SYMBOLS: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', MAD: 'MAD' };

/** Format a backend price already denominated in {@code currency}. */
export function formatPrice(amount: number, currency?: string | null): string {
  const code = (currency || 'MAD').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `${(amount || 0).toLocaleString('en-US')} ${PRICE_SYMBOLS[code] || code}`.trim();
  }
}

/** Review createdAt (ISO) → "20 Aug 2026". */
export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(iso)
    );
  } catch {
    return iso;
  }
}

export const PLAN_LABELS: Record<string, string> = {
  bb: 'Bed & Breakfast',
  ro: 'Room Only',
  hb: 'Half Board',
};

export function planSuffixOf(planId: string): string {
  return String(planId || '').split('::')[1] || 'bb';
}

export function planLabel(planId: string): string {
  const s = planSuffixOf(planId);
  return PLAN_LABELS[s] || s;
}

export function nights(n: number): string {
  return `${n} ${n === 1 ? 'night' : 'nights'}`;
}

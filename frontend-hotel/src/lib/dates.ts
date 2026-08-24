/** Date + URL-state helpers — ported from hotel-html/src/common.js (exact semantics). */

import type { CurrencyCode, SearchState } from '@/types';

/** FNV-1a 32-bit hash (deterministic availability/demand seeds). */
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Round to nearest 10, min 1 (rate-plan pricing). */
export function round10(n: number): number {
  return Math.max(1, Math.round(n / 10) * 10);
}

export function startOfDay(d: Date): Date {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

/** Add whole days (local, DST-safe via constructor arithmetic). */
export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** First day of month, n months from d. */
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Local-date ISO string `YYYY-MM-DD` (accepts already-ISO strings as-is). */
export function toISODate(d: Date | string): string {
  if (typeof d === 'string') return d;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse `YYYY-MM-DD` as a local date (never Date.parse — no UTC drift). */
export function fromISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function nightsBetween(a: Date | null, b: Date | null): number {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

/** True when `now` falls inside the stay window (check-in day included, check-out day excluded). */
export function inStayWindow(
  checkinIso: string,
  checkoutIso: string,
  now: Date = new Date()
): boolean {
  const ci = fromISODate(checkinIso);
  const co = fromISODate(checkoutIso);
  if (!ci || !co) return false;
  const today = startOfDay(now);
  return today.getTime() >= ci.getTime() && today.getTime() < co.getTime();
}

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const SM = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function fmt(d: Date | null): string {
  if (!d) return '';
  return `${SM[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function fmtShort(d: Date | null): string {
  if (!d) return '';
  return `${SM[d.getMonth()]} ${d.getDate()}`;
}

export function parseNum(v: unknown, fallback: number, min?: number, max?: number): number {
  const n = parseInt(String(v), 10);
  if (Number.isNaN(n)) return fallback;
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  return n;
}

export const CURRENCY_CODES: CurrencyCode[] = ['MAD', 'EUR', 'USD', 'GBP'];

export function getDefaultState(): SearchState {
  return {
    checkin: null,
    checkout: null,
    adults: 2,
    children: 0,
    childrenAges: [],
    rooms: 1,
    promo: '',
    currency: 'MAD',
  };
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse + validate a URL into a fresh SearchState.
 * checkin must be >= today; checkout strictly after checkin;
 * counts clamped; ages filtered to 0–17; promo uppercased; cur allowlisted.
 */
export function readStateFromURL(searchParams: URLSearchParams): SearchState {
  const state = getDefaultState();
  const today = startOfDay(new Date());

  const checkin = searchParams.get('checkin');
  if (checkin && ISO_RE.test(checkin)) {
    const d = fromISODate(checkin);
    if (d && +d >= +today) state.checkin = d;
  }

  const checkout = searchParams.get('checkout');
  if (checkout && ISO_RE.test(checkout)) {
    const d = fromISODate(checkout);
    if (d && state.checkin && +d > +state.checkin) state.checkout = d;
  }

  state.adults = parseNum(searchParams.get('adults'), 2, 1, 9);
  state.children = parseNum(searchParams.get('children'), 0, 0, 6);
  state.rooms = parseNum(searchParams.get('rooms'), 1, 1, 5);

  const ages = searchParams.get('ages');
  if (ages && state.children > 0) {
    state.childrenAges = ages
      .split(',')
      .map((x) => parseInt(x, 10))
      .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 17)
      .slice(0, state.children);
  }

  const promo = searchParams.get('promo');
  if (promo) state.promo = promo.trim().toUpperCase();

  const cur = searchParams.get('cur');
  if (cur && CURRENCY_CODES.includes(cur.toUpperCase() as CurrencyCode)) {
    state.currency = cur.toUpperCase() as CurrencyCode;
  }

  return state;
}

/** Serialize SearchState (+ extras) to URL params, mirroring the reference exactly. */
export function stateToParams(state: SearchState, extra?: Record<string, string>): URLSearchParams {
  const params = new URLSearchParams();
  if (state.checkin) params.set('checkin', toISODate(state.checkin));
  if (state.checkout) params.set('checkout', toISODate(state.checkout));
  params.set('adults', String(state.adults));
  params.set('children', String(state.children));
  if (state.children > 0 && state.childrenAges.length) {
    params.set('ages', state.childrenAges.slice(0, state.children).join(','));
  }
  params.set('rooms', String(state.rooms));
  if (state.promo) params.set('promo', state.promo);
  if (state.currency !== 'MAD') params.set('cur', state.currency);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    }
  }
  return params;
}

export function stateToQuery(state: SearchState, extra?: Record<string, string>): string {
  const q = stateToParams(state, extra).toString();
  return q ? `?${q}` : '';
}

/** Search-validation messages (exact reference strings). */
export function validateState(state: SearchState): string[] {
  const errors: string[] = [];
  if (!state.checkin || !state.checkout) {
    errors.push('Please choose your check-in and check-out dates.');
  } else if (+state.checkout <= +state.checkin) {
    errors.push('Check-out must be after check-in.');
  }
  if (state.children > 0 && state.childrenAges.length < state.children) {
    errors.push('Please select an age for each child.');
  }
  if (state.rooms > 1 && state.adults < state.rooms) {
    errors.push('Please assign at least one adult per room.');
  }
  return errors;
}

export function guestsLabel(state: Pick<SearchState, 'adults' | 'children' | 'rooms'>): string {
  const parts: string[] = [];
  parts.push(`${state.adults} adult${state.adults === 1 ? '' : 's'}`);
  if (state.children > 0) parts.push(`${state.children} child${state.children === 1 ? '' : 'ren'}`);
  parts.push(`${state.rooms} room${state.rooms === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

export function dateLabel(state: Pick<SearchState, 'checkin' | 'checkout'>): string {
  if (!state.checkin || !state.checkout) return 'Select dates';
  const nights = nightsBetween(state.checkin, state.checkout);
  return `${fmtShort(state.checkin)} – ${fmtShort(state.checkout)} · ${nights} night${nights === 1 ? '' : 's'}`;
}

export function totalGuests(state: Pick<SearchState, 'adults' | 'children'>): number {
  return state.adults + state.children;
}

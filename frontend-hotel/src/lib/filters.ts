/** Search-result facets — URL codec + option definitions (Phase 3).
    Filters live in the query string (`f_*` params) like all search state, so
    refresh, back/forward and deep links keep them. */

export interface SearchFilters {
  price: string[];
  plans: string[];
  refund: string[];
  cat: string[];
  amenities: string[];
}

export const emptyFilters = (): SearchFilters => ({
  price: [],
  plans: [],
  refund: [],
  cat: [],
  amenities: [],
});

export const FILTER_PARAMS: Record<keyof SearchFilters, string> = {
  price: 'f_price',
  plans: 'f_plans',
  refund: 'f_refund',
  cat: 'f_cat',
  amenities: 'f_am',
};

export const PRICE_OPTIONS = [
  { key: 'under-1000', label: 'Under MAD 1,000', min: 0, max: 999 },
  { key: '1000-1499', label: 'MAD 1,000 – 1,499', min: 1000, max: 1499 },
  { key: '1500-plus', label: 'MAD 1,500 +', min: 1500, max: Number.POSITIVE_INFINITY },
] as const;

export const PLAN_OPTIONS = [
  { key: 'bb', label: 'Bed & Breakfast' },
  { key: 'ro', label: 'Room only' },
  { key: 'hb', label: 'Half board' },
] as const;

export const REFUND_OPTIONS = [
  { key: 'free', label: 'Free cancellation' },
  { key: 'nonrefund', label: 'Non-refundable' },
] as const;

export const CAT_OPTIONS = [
  { key: 'standard', label: 'Standard rooms' },
  { key: 'suite', label: 'Suites' },
] as const;

const ALLOWED: Record<keyof SearchFilters, ReadonlySet<string>> = {
  price: new Set(PRICE_OPTIONS.map((o) => o.key)),
  plans: new Set(PLAN_OPTIONS.map((o) => o.key)),
  refund: new Set(REFUND_OPTIONS.map((o) => o.key)),
  cat: new Set(CAT_OPTIONS.map((o) => o.key)),
  amenities: new Set(),
};

function readParam(sp: URLSearchParams, key: keyof SearchFilters): string[] {
  const raw = sp.get(FILTER_PARAMS[key]);
  if (!raw) return [];
  const vals = raw
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(vals)];
  return key === 'amenities' ? unique : unique.filter((v) => ALLOWED[key].has(v));
}

/** Parse `f_*` params into a SearchFilters object (unknown values dropped). */
export function parseFilters(sp: URLSearchParams): SearchFilters {
  const f = emptyFilters();
  for (const key of Object.keys(FILTER_PARAMS) as (keyof SearchFilters)[]) {
    f[key] = readParam(sp, key);
  }
  return f;
}

/** Serialize non-empty facets to `f_*` params. */
export function filtersToParams(f: SearchFilters): URLSearchParams {
  const p = new URLSearchParams();
  for (const key of Object.keys(FILTER_PARAMS) as (keyof SearchFilters)[]) {
    if (f[key].length) p.set(FILTER_PARAMS[key], f[key].join(','));
  }
  return p;
}

export function filtersActive(f: SearchFilters): boolean {
  return Object.values(f).some((v) => v.length > 0);
}

export function filterCount(f: SearchFilters): number {
  return Object.values(f).reduce((n, v) => n + v.length, 0);
}

/** True when a per-night price falls inside the bracket key. */
export function priceBracketMatch(key: string, price: number): boolean {
  const o = PRICE_OPTIONS.find((x) => x.key === key);
  return o ? price >= o.min && price <= o.max : false;
}

/** Differentiating amenities across a result set — only those that can narrow
    results are offered (universal amenities are never facet options). */
export function amenityOptions(entryRooms: { amenities: string[] }[]): string[] {
  if (!entryRooms.length) return [];
  const sets = entryRooms.map((r) => new Set(r.amenities.map((a) => a.toLowerCase())));
  const all = [...new Set(sets.flatMap((s) => [...s]))].sort();
  return all.filter((opt) => sets.some((s) => s.has(opt)) && !sets.every((s) => s.has(opt)));
}

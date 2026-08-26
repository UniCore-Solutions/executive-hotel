/** Availability utilities — shared helpers for search filtering and sorting.
    All mock data functions have been removed; availability data now comes
    exclusively from the backend via catalog.ts. */
import { img, IMG_FALLBACK } from '@/data';
import type { Room, SearchResultEntry } from '@/types';
import { fromISODate, hashStr, startOfDay } from '@/lib/dates';
import { filtersActive, priceBracketMatch } from '@/lib/filters';
import type { SearchFilters } from '@/lib/filters';

export const image = img;
export { IMG_FALLBACK };

/** Stable demand score for popularity sorting. */
export function demandFor(room: Room): number {
  return hashStr(room.id) % 1000;
}

export function fitsGuests(room: Room, adults: number, children: number): boolean {
  return room.capacity.adults >= (adults || 1) && room.capacity.children >= (children || 0);
}

/** Apply search-result facets (any plan of a room may satisfy a facet). */
export function filterEntries(entries: SearchResultEntry[], f: SearchFilters): SearchResultEntry[] {
  if (!filtersActive(f)) return entries;
  return entries.filter((e) => {
    const minPrice = Math.min(...e.plans.map((p) => p.price));
    if (f.price.length && !f.price.some((k) => priceBracketMatch(k, minPrice))) return false;
    if (f.plans.length && !e.plans.some((p) => f.plans.includes(p.id.split('::')[1]!)))
      return false;
    if (
      f.refund.length &&
      !e.plans.some((p) => f.refund.includes(p.freeCancellation ? 'free' : 'nonrefund'))
    )
      return false;
    if (f.cat.length && !f.cat.includes(e.room.category)) return false;
    if (f.amenities.length) {
      const have = e.room.amenities.map((a) => a.toLowerCase());
      if (!f.amenities.every((a) => have.some((x) => x.includes(a)))) return false;
    }
    return true;
  });
}

/** Sibling-room link helpers (merge stay state — exact reference behavior). */
export function makeRoomUrl(roomId: string, planId: string, extra: Record<string, string>): string {
  const p = new URLSearchParams();
  p.set('id', roomId);
  if (planId) p.set('plan', planId);
  for (const [k, v] of Object.entries(extra || {})) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  }
  return `?${p.toString()}`;
}

export function normDate(d: Date | string | null): Date | null {
  return typeof d === 'string' ? fromISODate(d) : startOfDay(d ?? new Date());
}

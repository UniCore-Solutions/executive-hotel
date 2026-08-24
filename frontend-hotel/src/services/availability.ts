/** Availability + room API — faithful port of RC.api (data.js). */
import { DATA, img, IMG_FALLBACK } from '@/data';
import type {
  Availability,
  Offer,
  Extra,
  Property,
  RatePlan,
  Review,
  Room,
  SearchResultEntry,
  StayRoomResult,
} from '@/types';
import { fromISODate, hashStr, round10, startOfDay, toISODate } from '@/lib/dates';
import { filtersActive, priceBracketMatch } from '@/lib/filters';
import type { SearchFilters } from '@/lib/filters';

export const delayMs = 350;
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const image = img;
export { IMG_FALLBACK };

export function plansFor(room: Room): RatePlan[] {
  const base = room.pricePerNight;
  const freeCancel = room.cancellationPolicy.startsWith('Free cancellation');
  const plans: RatePlan[] = [
    {
      id: `${room.id}::bb`,
      name: 'Bed & Breakfast',
      mealPlan: 'Breakfast included',
      price: base,
      cancellationPolicy: room.cancellationPolicy,
      benefits: ['Daily breakfast', 'Fresh hammam towels', 'Free Wi-Fi'],
      freeCancellation: freeCancel,
    },
    {
      id: `${room.id}::ro`,
      name: 'Room Only',
      mealPlan: 'No meals included',
      price: round10(base * 0.85),
      cancellationPolicy: 'Non-refundable',
      benefits: [],
      freeCancellation: false,
    },
  ];
  if (base >= 950) {
    plans.push({
      id: `${room.id}::hb`,
      name: 'Half Board',
      mealPlan: 'Breakfast & dinner included',
      price: round10(base * 1.12),
      cancellationPolicy: room.cancellationPolicy,
      benefits: ['Daily breakfast', 'Dinner', 'Evening tea service'],
      freeCancellation: freeCancel,
    });
  }
  return plans;
}

export function availabilityFor(room: Room, ciIso: string): Availability {
  if (room.availability === 'soldout') return 'soldout';
  const r = (hashStr(`${room.id}|${ciIso || ''}`) % 10000) / 100;
  if (r < 24) return 'soldout';
  if (r < 42) return 'few';
  return 'available';
}

/** Stable demand score for popularity sorting. */
export function demandFor(room: Room): number {
  return hashStr(room.id) % 1000;
}

export function fitsGuests(room: Room, adults: number, children: number): boolean {
  return room.capacity.adults >= (adults || 1) && room.capacity.children >= (children || 0);
}

function ciIsoOf(checkin?: Date | string | null): string {
  return checkin ? toISODate(checkin) : toISODate(new Date());
}

function numOf(v: unknown, fallback: number): number {
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? fallback : n;
}

/** Availability-driven room search (BOOK-1). */
export async function searchRooms(
  params: { checkin?: Date | string | null; adults?: number; children?: number } = {}
): Promise<SearchResultEntry[]> {
  const ciIso = ciIsoOf(params.checkin);
  const adults = numOf(params.adults, 2);
  const children = numOf(params.children, 0);
  await delay(delayMs);
  const entries: SearchResultEntry[] = [];
  for (const room of DATA.PROPERTY.rooms) {
    const availability = availabilityFor(room, ciIso);
    if (availability === 'soldout' || !fitsGuests(room, adults, children)) continue;
    entries.push({ room, availability, plans: plansFor(room), demand: demandFor(room) });
  }
  return entries;
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

/** All rooms with availability (hotel page). */
export async function getStay(
  hotelId: string,
  params: { checkin?: Date | string | null; adults?: number; children?: number } = {}
): Promise<{
  hotel: Property;
  rooms: Array<{ room: Room; availability: Availability; plans: RatePlan[]; fits: boolean }>;
} | null> {
  const p = hotelId ? DATA.PROPERTIES.find((x) => x.id === hotelId) : DATA.PROPERTY;
  const ciIso = ciIsoOf(params.checkin);
  const adults = numOf(params.adults, 2);
  const children = numOf(params.children, 0);
  await delay(Math.min(delayMs, 250));
  if (!p) return null;
  return {
    hotel: p,
    rooms: p.rooms.map((room) => ({
      room,
      availability: availabilityFor(room, ciIso),
      plans: plansFor(room),
      fits: fitsGuests(room, adults, children),
    })),
  };
}

/** Room detail with availability + plans + siblings. */
export async function getStayRoom(
  hotelId: string | undefined,
  roomId: string,
  params: { checkin?: Date | string | null; adults?: number; children?: number } = {}
): Promise<StayRoomResult | null> {
  const p = hotelId ? DATA.PROPERTIES.find((x) => x.id === hotelId) : DATA.PROPERTY;
  if (!p) {
    await delay(100);
    return null;
  }
  const r = p.rooms.find((x) => x.id === roomId);
  if (!r) {
    await delay(100);
    return null;
  }
  const ciIso = ciIsoOf(params.checkin);
  const adults = numOf(params.adults, 2);
  const children = numOf(params.children, 0);
  await delay(Math.min(delayMs, 250));
  return {
    property: p,
    room: { ...r },
    availability: availabilityFor(r, ciIso),
    plans: plansFor(r),
    fits: fitsGuests(r, adults, children),
    siblingRooms: p.rooms
      .map((room) => ({ room, availability: availabilityFor(room, ciIso), plans: plansFor(room) }))
      .filter((x) => x.room.id !== roomId),
  };
}

export async function getProperty(id?: string): Promise<Property | null> {
  await delay(Math.min(delayMs, 250));
  const p = id ? DATA.PROPERTIES.find((x) => x.id === id) : DATA.PROPERTY;
  return p || null;
}

export async function getPlans(roomId: string): Promise<RatePlan[]> {
  const r = DATA.PROPERTY.rooms.find((x) => x.id === roomId);
  return r ? plansFor(r) : [];
}

export async function getRoom(
  propertyId: string,
  roomId: string
): Promise<{ property: Property; room: Room } | null> {
  const p = propertyId ? DATA.PROPERTIES.find((x) => x.id === propertyId) : DATA.PROPERTY;
  if (!p) {
    await delay(Math.min(delayMs, 250));
    return null;
  }
  const r = p.rooms.find((x) => x.id === roomId);
  await delay(Math.min(delayMs, 250));
  return r ? { property: p, room: { ...r } } : null;
}

export async function getAvailability(roomId: string, ciIso: string): Promise<Availability> {
  const r = DATA.PROPERTY.rooms.find((x) => x.id === roomId);
  return r ? availabilityFor(r, ciIso) : 'soldout';
}

export function getOffers(): Promise<Offer[]> {
  return Promise.resolve(DATA.OFFERS);
}

export function getExtras(): Promise<Extra[]> {
  return Promise.resolve(DATA.EXTRAS);
}

export function getReviews(): Promise<Review[]> {
  return Promise.resolve(DATA.PROPERTY.reviews);
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

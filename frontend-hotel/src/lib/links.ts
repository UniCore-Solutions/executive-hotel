/** Stay-aware URL builders — port of common.js searchURL / roomURL / bookingURL.
    State params ride along so a room opened from a search never loses the stay. */

import { stateToQuery } from '@/lib/dates';
import type { SearchState } from '@/types';

/** /search?<stay params>[&extra...] */
export function searchURL(state: SearchState, extra?: Record<string, string>): string {
  return `/search${stateToQuery(state, extra)}`;
}

/** /hotel?roomId=[roomId]&<stay params>[&plan=][&extra...] — room state lives on
    the hotel page via query params (D-26); /room/[roomId] redirects here. */
export function roomURL(
  state: SearchState,
  roomId: string,
  planId?: string,
  extra?: Record<string, string>
): string {
  const q = stateToQuery(state, { ...(planId ? { plan: planId } : {}), ...(extra || {}) });
  return `/hotel?roomId=${roomId}${q ? `&${q.slice(1)}` : ''}`;
}

/** /hotel?hotelid=[hotelId] — backend hotel details page. */
export function hotelURL(hotelId: string): string {
  return `/hotel?hotelid=${hotelId}`;
}

/** /hotel?hotelid=[hotelId]&roomId=[roomId]&<stay params>[&plan=][&extra...] — a
    specific room type of a specific hotel (backend mode room links). */
export function hotelRoomURL(
  state: SearchState,
  hotelId: string,
  roomId: string,
  planId?: string,
  extra?: Record<string, string>
): string {
  const q = stateToQuery(state, { ...(planId ? { plan: planId } : {}), ...(extra || {}) });
  return `/hotel?hotelid=${hotelId}&roomId=${roomId}${q ? `&${q.slice(1)}` : ''}`;
}

/** /booking?room=[roomId][&plan=][&extra...] — room id via ?room= as in the reference. */
export function bookingURL(
  state: SearchState,
  roomId: string,
  planId?: string,
  extra?: Record<string, string>
): string {
  return `/booking${stateToQuery(state, { room: roomId, ...(planId ? { plan: planId } : {}), ...(extra || {}) })}`;
}

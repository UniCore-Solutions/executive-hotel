import type { ApolloClient } from '@apollo/client';

/**
 * Cache-invalidation registry — the single home for "which Apollo queries
 * must be refetched after which REST write". TanStack Query manages only
 * the mutation lifecycle (pending/error) and caches no read data — Apollo
 * is the one read cache in this app.
 *
 * Entries are the actual GraphQL root-field names as they appear in this
 * app's own `.graphql` documents (`adminHotel`, `adminReservations`, …) —
 * `cache.evict({ fieldName })` matches the normalized `ROOT_QUERY` field
 * key exactly, case-sensitively. This registry previously used PascalCase
 * names (`AdminHotel`, `AdminRoomTypes`, …) that don't match any field in
 * the schema (real fields are camelCase; `AdminRoomTypes`/`AdminRatePlans`/
 * `AdminAvailability`/`AdminReservation`/`AdminRoomType`/`AdminRooms` don't
 * exist at all — those reads all nest under the one `adminHotel(hotelId)`
 * query). Every `cache.evict` call was therefore a silent no-op: found
 * while building the rate-plans module, whose create-then-navigate flow
 * (mirroring `RoomTypeCreateSheet`) landed on "Rate plan not found" because
 * the edit page's `adminHotel` query re-read the pre-creation cache instead
 * of refetching. Same defect, same fix, for every module sharing this
 * registry — not rate-plan-specific.
 */
export const REST_INVALIDATIONS: Record<string, string[]> = {
  // Cancelling releases the room lines' held inventory (BookingServiceImpl
  // #doCancel -> InventoryService#release) — `adminHotel` backs both the
  // Availability tab and the Room Types workspace, so without it staff can
  // cancel a reservation and still see the old (higher) sold count until an
  // unrelated action or a hard reload happens to evict the cache.
  'reservations.cancel': ['adminReservations', 'adminDashboard', 'adminHotel'],
  'reservations.assignRoom': ['adminReservations', 'adminDashboard'],
  'reservations.checkIn': ['adminReservations', 'adminDashboard'],
  'reservations.checkOut': ['adminReservations', 'adminDashboard'],
  'roomTypes.create': ['adminHotel'],
  'roomTypes.update': ['adminHotel'],
  'roomTypes.amenities': ['adminHotel'],
  'roomTypes.media': ['adminHotel'],
  'rooms.create': ['adminHotel'],
  'rooms.update': ['adminHotel'],
  'ratePlans.create': ['adminHotel'],
  'ratePlans.update': ['adminHotel'],
  'ratePlans.link': ['adminHotel'],
  'ratePlans.unlink': ['adminHotel'],
  'ratePlans.prices': ['adminHotel'],
  'promotions.create': ['adminPromotions'],
  'promotions.update': ['adminPromotions'],
  'promotions.status': ['adminPromotions'],
  'availability.range': ['adminHotel'],
  'hotels.create': ['adminHotels'],
  'hotels.update': ['adminHotel', 'adminDashboard'],
  'hotels.amenities': ['adminHotel'],
  'hotels.media': ['adminHotel'],
  'hotels.policies': ['adminHotel'],
  'platform.update': ['platform'],
  'platform.media': ['platform'],
  'reviews.moderate': ['adminReviews'],
  'users.create': ['adminUsers'],
  'users.assignRole': ['adminUsers', 'adminRoles'],
  'users.revokeRole': ['adminUsers', 'adminRoles'],
};

export function invalidateGraphql(apollo: ApolloClient, operationKey: string): void {
  const cache = apollo.cache;
  for (const name of REST_INVALIDATIONS[operationKey] ?? []) {
    cache.evict({ fieldName: name });
  }
  cache.gc();
}

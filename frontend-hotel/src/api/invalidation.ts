import type { ApolloClient } from '@apollo/client';

/**
 * Cache-invalidation registry — the single home for "which Apollo queries
 * must be refreshed after which REST write".
 *
 * Every REST endpoint that mutates state declares the GraphQL query names it
 * invalidates. After a successful write the caller calls
 * `invalidateGraphql(client, [...names])`, which evicts those queries from
 * the Apollo cache so the next read refetches from the backend. No component
 * invents its own invalidation; this map IS the strategy.
 *
 * Entries are the GraphQL *field* names as selected on `Query` in
 * src/graphql/*.graphql (e.g. `myReservations`, `reservation`) — NOT the
 * `query Xyz { ... }` operation names. `ApolloCache.evict({ fieldName })`
 * matches against the normalized store's field keys, which are the schema
 * field name (optionally with a serialized-args suffix that an unqualified
 * evict ignores) — never the operation name. `query MyReservations {
 * myReservations { ... } }` stores under `myReservations`; evicting
 * `"MyReservations"` (capital M) silently matches nothing and the whole
 * entry becomes a no-op. Get this wrong here and a REST write looks
 * successful while every cache-first read in the tab keeps serving
 * pre-write data until a hard reload.
 */

export const REST_INVALIDATIONS: Record<string, string[]> = {
  // ---- guest: reservations & payments (POST /api/v1/reservations, ...) ----
  'reservations.create': ['myReservations'],
  'reservations.cancel': ['myReservations', 'reservation'],
  'payments.create': ['myReservations'],
  'payments.capture': ['myReservations'],
  'auth.profile': ['Me'],

  // ---- back-office: catalog ----
  'admin.hotels.create': ['AdminHotels', 'AdminHotel'],
  'admin.hotels.update': ['AdminHotels', 'AdminHotel', 'HotelById', 'HotelDetails', 'CanonicalHotel', 'Homepage', 'StaySearch'],
  'admin.hotels.amenities': ['AdminHotel', 'HotelDetails'],
  'admin.hotels.media': ['AdminHotel', 'HotelDetails'],
  'admin.hotels.policies': ['AdminHotel', 'HotelDetails'],
  'admin.roomTypes.create': ['AdminHotel', 'RoomTypes'],
  'admin.roomTypes.update': ['AdminHotel', 'RoomTypeById'],
  'admin.roomTypes.amenities': ['AdminHotel'],
  'admin.roomTypes.media': ['AdminHotel'],
  'admin.rooms.create': ['AdminHotel', 'RoomTypes'],
  'admin.rooms.update': ['AdminHotel', 'RoomTypeById'],

  // ---- back-office: rates ----
  'admin.ratePlans.create': ['AdminHotel'],
  'admin.ratePlans.update': ['AdminHotel', 'Rates', 'StayRates'],
  'admin.ratePlans.link': ['AdminHotel', 'Rates'],
  'admin.ratePlans.unlink': ['AdminHotel', 'Rates'],
  'admin.ratePlans.prices': ['AdminHotel', 'Rates', 'StayRates', 'Quote', 'RoomTypeById'],

  // ---- back-office: promotions ----
  'admin.promotions.create': ['AdminPromotions', 'HotelOffers'],
  'admin.promotions.update': ['AdminPromotions', 'HotelOffers'],
  'admin.promotions.status': ['AdminPromotions', 'HotelOffers'],

  // ---- back-office: availability ----
  'admin.availability.range': ['AdminHotel', 'Availability', 'StaySearch', 'StayAvailability'],

  // ---- back-office: reservations ----
  'admin.reservations.cancel': ['AdminReservations', 'AdminDashboard', 'MyReservations'],

  // ---- back-office: reviews ----
  'admin.reviews.moderate': ['AdminReviews', 'HotelReviews', 'HotelDetails'],

  // ---- back-office: users & roles ----
  'admin.users.create': ['AdminUsers'],
  'admin.users.assignRole': ['AdminUsers', 'AdminRoles'],
  'admin.users.revokeRole': ['AdminUsers', 'AdminRoles'],
};

/**
 * Evict every listed query from the Apollo cache. A query name may be absent
 * from the cache (never fetched) — eviction is a no-op then. The next render
 * of a watcher re-fetches from the backend.
 */
export function invalidateGraphql(
  client: ApolloClient,
  queryNames: string[] | undefined
): void {
  if (!queryNames || queryNames.length === 0) return;
  const cache = client.cache;
  for (const name of queryNames) {
    cache.evict({ fieldName: name });
  }
  cache.gc();
}

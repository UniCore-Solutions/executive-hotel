import type { ApolloClient } from '@apollo/client';
import type { QueryClient } from '@tanstack/react-query';

/**
 * Cache-invalidation registry — the single home for "which caches must be
 * refreshed after which REST write".
 *
 * E3/E4 transition note: until the back-office reads move to Apollo (E4),
 * the React Query cache is still the read cache, so a write invalidates
 * BOTH the affected React Query keys (today) and the Apollo queries (from
 * E4 on). `invalidateAfterWrite` does both; after E4 the RQ keys can be
 * dropped.
 */

export const REST_INVALIDATIONS: Record<string, string[]> = {
  'admin.hotels.create': ['AdminHotels', 'AdminHotel'],
  'admin.hotels.update': ['AdminHotels', 'AdminHotel', 'HotelById', 'HotelDetails', 'CanonicalHotel', 'Homepage', 'StaySearch'],
  'admin.hotels.amenities': ['AdminHotel', 'HotelDetails'],
  'admin.hotels.media': ['AdminHotel', 'HotelDetails'],
  'admin.hotels.policies': ['AdminHotel', 'HotelDetails'],
  'admin.roomTypes.create': ['AdminHotel'],
  'admin.roomTypes.update': ['AdminHotel'],
  'admin.roomTypes.amenities': ['AdminHotel'],
  'admin.roomTypes.media': ['AdminHotel'],
  'admin.rooms.create': ['AdminHotel'],
  'admin.rooms.update': ['AdminHotel'],
  'admin.ratePlans.create': ['AdminHotel'],
  'admin.ratePlans.update': ['AdminHotel'],
  'admin.ratePlans.link': ['AdminHotel'],
  'admin.ratePlans.unlink': ['AdminHotel'],
  'admin.ratePlans.prices': ['AdminHotel'],
  'admin.promotions.create': ['AdminPromotions', 'HotelOffers'],
  'admin.promotions.update': ['AdminPromotions', 'HotelOffers'],
  'admin.promotions.status': ['AdminPromotions', 'HotelOffers'],
  'admin.availability.range': ['AdminHotel', 'Availability', 'StaySearch', 'StayAvailability'],
  'admin.reservations.cancel': ['AdminReservations', 'AdminDashboard', 'MyReservations'],
  'admin.reviews.moderate': ['AdminReviews', 'HotelReviews', 'HotelDetails'],
  'admin.users.create': ['AdminUsers'],
  'admin.users.assignRole': ['AdminUsers', 'AdminRoles'],
  'admin.users.revokeRole': ['AdminUsers', 'AdminRoles'],
};

export function invalidateAfterWrite(
  apollo: ApolloClient,
  queryClient: QueryClient,
  restKey: string,
  reactQueryKeys: unknown[][]
): void {
  // React Query read cache (until E4 migrates reads to Apollo)
  for (const key of reactQueryKeys) {
    void queryClient.invalidateQueries({ queryKey: key });
  }
  // Apollo read cache (from E4 on)
  const cache = apollo.cache;
  for (const name of REST_INVALIDATIONS[restKey] ?? []) {
    cache.evict({ fieldName: name });
  }
  cache.gc();
}

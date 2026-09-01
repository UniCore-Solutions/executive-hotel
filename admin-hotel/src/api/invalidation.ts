import type { ApolloClient } from '@apollo/client';

/**
 * Cache-invalidation registry — the single home for "which Apollo queries
 * must be refetched after which REST write". TanStack Query manages only
 * the mutation lifecycle (pending/error) and caches no read data — Apollo
 * is the one read cache in this app.
 */
export const REST_INVALIDATIONS: Record<string, string[]> = {
  'reservations.cancel': ['AdminReservations', 'AdminReservation', 'AdminDashboard'],
  'roomTypes.create': ['AdminHotel', 'AdminRoomTypes'],
  'roomTypes.update': ['AdminHotel', 'AdminRoomTypes', 'AdminRoomType'],
  'roomTypes.amenities': ['AdminHotel', 'AdminRoomType'],
  'roomTypes.media': ['AdminHotel', 'AdminRoomType'],
  'rooms.create': ['AdminHotel', 'AdminRoomTypes', 'AdminRooms'],
  'rooms.update': ['AdminHotel', 'AdminRooms'],
  'ratePlans.create': ['AdminHotel', 'AdminRatePlans'],
  'ratePlans.update': ['AdminHotel', 'AdminRatePlans', 'AdminRatePlan'],
  'ratePlans.link': ['AdminHotel', 'AdminRatePlans'],
  'ratePlans.unlink': ['AdminHotel', 'AdminRatePlans'],
  'ratePlans.prices': ['AdminHotel', 'AdminRatePlans'],
  'promotions.create': ['AdminPromotions'],
  'promotions.update': ['AdminPromotions'],
  'promotions.status': ['AdminPromotions'],
  'availability.range': ['AdminHotel', 'AdminAvailability'],
  'hotels.update': ['AdminHotel', 'AdminDashboard'],
  'hotels.amenities': ['AdminHotel'],
  'hotels.media': ['AdminHotel'],
  'hotels.policies': ['AdminHotel'],
  'reviews.moderate': ['AdminReviews'],
  'users.create': ['AdminUsers'],
  'users.assignRole': ['AdminUsers', 'AdminRoles'],
  'users.revokeRole': ['AdminUsers', 'AdminRoles'],
};

export function invalidateGraphql(apollo: ApolloClient, operationKey: string): void {
  const cache = apollo.cache;
  for (const name of REST_INVALIDATIONS[operationKey] ?? []) {
    cache.evict({ fieldName: name });
  }
  cache.gc();
}

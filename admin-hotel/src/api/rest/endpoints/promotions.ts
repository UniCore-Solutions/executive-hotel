import { restClient } from '../client';

/**
 * Promotion write endpoints. Ground-truthed against
 * `AdminRateRestController` (backend-hotel): promotions are written over
 * REST, read over GraphQL (top-level `adminPromotions(hotelId)`) — same
 * READ=GraphQL/WRITE=REST split as rate plans.
 *
 * `createPromotion`'s `hotelId` is a query param, not a path segment
 * (`POST /api/v1/admin/promotions?hotelId=...`) — confirmed live: the
 * backend also allows an omitted `hotelId` for a platform-wide promotion,
 * but that path requires `super_admin` (`RateAdminServiceImpl
 * #createPromotion`) and this hotel-scoped admin page always supplies one.
 */
export interface PromotionInput {
  code?: string;
  name?: string;
  description?: string;
  discountType?: string;
  discountValue?: number;
  bookingWindowStart?: string;
  bookingWindowEnd?: string;
  stayWindowStart?: string;
  stayWindowEnd?: string;
  minNights?: number;
  maxUsageTotal?: number;
  maxUsagePerGuest?: number;
  stackable?: boolean;
  appliesToAllRoomTypes?: boolean;
  appliesToAllRatePlans?: boolean;
  applicableDaysOfWeek?: string;
  status?: string;
}

export async function createPromotion(hotelId: string, input: PromotionInput): Promise<{ id: string }> {
  const { data } = await restClient.post('/admin/promotions', input, { params: { hotelId } });
  return data as { id: string };
}

export async function updatePromotion(id: string, input: PromotionInput): Promise<unknown> {
  const { data } = await restClient.put(`/admin/promotions/${id}`, input);
  return data;
}

export async function setPromotionStatus(id: string, status: string): Promise<unknown> {
  const { data } = await restClient.put(`/admin/promotions/${id}/status`, { status });
  return data;
}

import { restClient } from '../client';

/**
 * Rate plan write endpoints. Ground-truthed against
 * `AdminRateRestController` (backend-hotel): rate plans are written over
 * REST, read over GraphQL (`adminHotel(hotelId).ratePlans`) — same
 * READ=GraphQL/WRITE=REST split as room types and rooms.
 */
export interface RatePlanInput {
  name?: string;
  code?: string;
  currencyCode?: string;
  mealPlan?: string;
  cancellationPolicy?: string;
  paymentPolicy?: string;
  isRefundable?: boolean;
  cancellationDeadlineDays?: number;
  cancellationPenaltyType?: string;
  cancellationPenaltyValue?: number;
  paymentTiming?: string;
  depositPercentage?: number;
  minStay?: number;
  maxStay?: number;
  status?: string;
}

export interface RatePlanPriceInput {
  validFrom: string;
  validTo: string;
  priceAmount: number;
}

export interface RatePlanPriceResult {
  id: string;
  validFrom: string;
  validTo: string;
  priceAmount: number;
}

export interface RoomTypeRatePlanLink {
  id: string;
  roomTypeId: string;
  roomTypeName: string;
  ratePlanId: string;
  currencyCode: string;
  prices: RatePlanPriceResult[];
}

export async function createRatePlan(hotelId: string, input: RatePlanInput): Promise<{ id: string }> {
  const { data } = await restClient.post(`/admin/hotels/${hotelId}/rate-plans`, input);
  return data as { id: string };
}

export async function updateRatePlan(id: string, input: RatePlanInput): Promise<unknown> {
  const { data } = await restClient.put(`/admin/rate-plans/${id}`, input);
  return data;
}

export async function linkRoomTypeRatePlan(roomTypeId: string, ratePlanId: string): Promise<RoomTypeRatePlanLink> {
  const { data } = await restClient.post(`/admin/room-type-rate-plans`, { roomTypeId, ratePlanId });
  return data as RoomTypeRatePlanLink;
}

export async function unlinkRoomTypeRatePlan(linkId: string): Promise<void> {
  await restClient.delete(`/admin/room-type-rate-plans/${linkId}`);
}

export async function setRatePlanPrices(
  linkId: string,
  prices: RatePlanPriceInput[],
): Promise<RatePlanPriceResult[]> {
  const { data } = await restClient.put(`/admin/room-type-rate-plans/${linkId}/prices`, prices);
  return data as RatePlanPriceResult[];
}

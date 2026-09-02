import { restClient } from './client';

/**
 * Typed REST operations for the back-office — every write/action goes
 * through here (API rule: GraphQL = READ, REST = WRITE/ACTION). Callers
 * (React Query mutationFns, hooks) never touch axios directly.
 */

// ---- catalog ----

export async function createHotel(input: unknown): Promise<{ id: string }> {
  const { data } = await restClient.post('/v1/admin/hotels', input);
  return data as { id: string };
}

export async function updateHotel(id: string, input: unknown): Promise<unknown> {
  const { data } = await restClient.put(`/v1/admin/hotels/${id}`, input);
  return data;
}

export async function setHotelAmenities(hotelId: string, amenityIds: string[]): Promise<unknown> {
  const { data } = await restClient.put(`/v1/admin/hotels/${hotelId}/amenities`, amenityIds);
  return data;
}

export async function setHotelMedia(hotelId: string, media: unknown[]): Promise<unknown> {
  const { data } = await restClient.put(`/v1/admin/hotels/${hotelId}/media`, media);
  return data;
}

export async function setHotelPolicies(hotelId: string, policies: unknown[]): Promise<unknown> {
  const { data } = await restClient.put(`/v1/admin/hotels/${hotelId}/policies`, policies);
  return data;
}

export async function createRoomType(hotelId: string, input: unknown): Promise<unknown> {
  const { data } = await restClient.post(`/v1/admin/hotels/${hotelId}/room-types`, input);
  return data;
}

export async function updateRoomType(id: string, input: unknown): Promise<unknown> {
  const { data } = await restClient.put(`/v1/admin/room-types/${id}`, input);
  return data;
}

export async function setRoomTypeAmenities(
  roomTypeId: string,
  amenityIds: string[]
): Promise<unknown> {
  const { data } = await restClient.put(`/v1/admin/room-types/${roomTypeId}/amenities`, amenityIds);
  return data;
}

export async function setRoomTypeMedia(roomTypeId: string, media: unknown[]): Promise<unknown> {
  const { data } = await restClient.put(`/v1/admin/room-types/${roomTypeId}/media`, media);
  return data;
}

export async function createRoom(hotelId: string, input: unknown): Promise<unknown> {
  const { data } = await restClient.post(`/v1/admin/hotels/${hotelId}/rooms`, input);
  return data;
}

export async function updateRoom(id: string, input: unknown): Promise<unknown> {
  const { data } = await restClient.put(`/v1/admin/rooms/${id}`, input);
  return data;
}

// ---- rate plans & prices ----

export async function createRatePlan(hotelId: string, input: unknown): Promise<unknown> {
  const { data } = await restClient.post(`/v1/admin/hotels/${hotelId}/rate-plans`, input);
  return data;
}

export async function updateRatePlan(id: string, input: unknown): Promise<unknown> {
  const { data } = await restClient.put(`/v1/admin/rate-plans/${id}`, input);
  return data;
}

export async function linkRoomTypeRatePlan(
  roomTypeId: string,
  ratePlanId: string
): Promise<unknown> {
  const { data } = await restClient.post('/v1/admin/room-type-rate-plans', {
    roomTypeId,
    ratePlanId,
  });
  return data;
}

export async function unlinkRoomTypeRatePlan(linkId: string): Promise<void> {
  await restClient.delete(`/v1/admin/room-type-rate-plans/${linkId}`);
}

export async function setRatePlanPrices(linkId: string, prices: unknown[]): Promise<unknown> {
  const { data } = await restClient.put(`/v1/admin/room-type-rate-plans/${linkId}/prices`, prices);
  return data;
}

// ---- promotions ----

export async function createPromotion(hotelId: string | null, input: unknown): Promise<unknown> {
  const query = hotelId ? `?hotelId=${encodeURIComponent(hotelId)}` : '';
  const { data } = await restClient.post(`/v1/admin/promotions${query}`, input);
  return data;
}

export async function updatePromotion(id: string, input: unknown): Promise<unknown> {
  const { data } = await restClient.put(`/v1/admin/promotions/${id}`, input);
  return data;
}

export async function setPromotionStatus(id: string, status: string): Promise<unknown> {
  const { data } = await restClient.put(`/v1/admin/promotions/${id}/status`, { status });
  return data;
}

// ---- availability ----

export async function updateAvailabilityRange(
  hotelId: string,
  input: unknown
): Promise<unknown> {
  const { data } = await restClient.put(`/v1/admin/availability/hotels/${hotelId}`, input);
  return data;
}

// ---- reservations & reviews ----

export async function adminCancelReservation(
  reservationId: string,
  input: { reasonCode?: string; reasonNote?: string }
): Promise<unknown> {
  const { data } = await restClient.post(`/v1/admin/reservations/${reservationId}/cancel`, input);
  return data;
}

export interface AdminCreditNoteData {
  creditNoteNumber: string;
  billingName: string;
  currencyCode: string;
  originalAmount: number;
  penaltyAmount: number;
  creditedAmount: number;
  issuedAt: string;
}

/** Read-only — a credit note is issued automatically on cancellation, never
    on demand. Throws (404) if none exists for this reservation. */
export async function adminGetCreditNote(reservationId: string): Promise<AdminCreditNoteData> {
  const { data } = await restClient.get(`/v1/admin/reservations/${reservationId}/credit-note`);
  return data as AdminCreditNoteData;
}

export async function moderateReview(
  id: string,
  input: { status: string; response?: string }
): Promise<unknown> {
  const { data } = await restClient.post(`/v1/admin/reviews/${id}/moderation`, input);
  return data;
}

// ---- users & roles ----

export async function createUser(input: unknown): Promise<unknown> {
  const { data } = await restClient.post('/v1/admin/users', input);
  return data;
}

export async function assignRole(
  userId: string,
  input: { roleName: string; hotelId?: string }
): Promise<unknown> {
  const { data } = await restClient.post(`/v1/admin/users/${userId}/roles`, input);
  return data;
}

export async function revokeRole(userRoleId: string): Promise<unknown> {
  const { data } = await restClient.delete(`/v1/admin/users/roles/${userRoleId}`);
  return data;
}

// ---- media ----

export async function uploadMedia(
  file: File,
  owner: { type: 'hotel' | 'room_type'; id: string },
  meta: { altText?: string; category?: string; isPrimary?: boolean }
): Promise<{ id: string; url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('ownerType', owner.type);
  formData.append('ownerId', owner.id);
  if (meta.altText) formData.append('altText', meta.altText);
  if (meta.category) formData.append('category', meta.category);
  if (meta.isPrimary !== undefined) formData.append('isPrimary', String(meta.isPrimary));
  const { data } = await restClient.post('/v1/media/upload', formData);
  return data as { id: string; url: string };
}

export async function deleteMedia(id: string): Promise<void> {
  await restClient.delete(`/v1/media/${id}`);
}

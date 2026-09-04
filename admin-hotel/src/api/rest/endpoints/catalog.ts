import { restClient } from '../client';
import type { Media } from '@/graphql/generated/graphql';

export interface HotelInput {
  name?: string;
  brand?: string;
  description?: string;
  hotelType?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  starRating?: number;
  checkInTime?: string;
  checkOutTime?: string;
  defaultCurrency?: string;
  status?: string;
}

export interface HotelPolicyInput {
  name: string;
  value: string;
  icon?: string;
  sortOrder?: number;
}

export interface RoomTypeInput {
  name?: string;
  description?: string;
  maxAdults?: number;
  maxChildren?: number;
  bedConfiguration?: string;
  sizeSqm?: number;
  viewType?: string;
  status?: string;
}

export interface RoomInput {
  roomTypeId?: string;
  roomNumber?: string;
  floor?: string;
  status?: string;
  housekeepingStatus?: string;
  maintenanceStatus?: string;
}

export interface MediaInput {
  url: string;
  altText?: string;
  category?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

/** Governed media category vocabulary — mirrors the backend's
 * `Media.CATEGORY_*` constants. `LOGO` is the only one with a uniqueness
 * rule (one per hotel/platform, backend-enforced); the rest are
 * informational. Single source of truth so the literal isn't repeated
 * across `LogoUploadField`/`HotelGallery`/`PlatformGallery`. */
export const MEDIA_CATEGORY_LOGO = 'logo';

// ---------------------------------------------------------------- hotel settings

export async function createHotel(input: HotelInput): Promise<{ id: string }> {
  const { data } = await restClient.post('/admin/hotels', input);
  return data as { id: string };
}

export async function updateHotel(id: string, input: HotelInput): Promise<unknown> {
  const { data } = await restClient.put(`/admin/hotels/${id}`, input);
  return data;
}

export async function setHotelAmenities(hotelId: string, amenityIds: string[]): Promise<unknown> {
  const { data } = await restClient.put(`/admin/hotels/${hotelId}/amenities`, amenityIds);
  return data;
}

export async function setHotelMedia(hotelId: string, media: MediaInput[]): Promise<unknown> {
  const { data } = await restClient.put(`/admin/hotels/${hotelId}/media`, media);
  return data;
}

export async function setHotelPolicies(hotelId: string, policies: HotelPolicyInput[]): Promise<unknown> {
  const { data } = await restClient.put(`/admin/hotels/${hotelId}/policies`, policies);
  return data;
}

/**
 * Hotel-level media upload, unlike `uploadRoomTypeImage` below, needs no
 * workaround: `MediaStorageServiceImpl.Owner.of` accepts ownerType "hotel"
 * directly (only "room_type" is rejected — see J-6), and the upload call
 * already sets sortOrder/isPrimary/hotelId correctly on its own. So this is
 * just the upload — no follow-up replace-list call needed to attach it.
 */
export async function uploadHotelImage(
  hotelId: string,
  file: File,
  meta: { altText?: string; category?: string; isPrimary?: boolean },
): Promise<Media> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('ownerType', 'hotel');
  formData.append('ownerId', hotelId);
  if (meta.altText) formData.append('altText', meta.altText);
  if (meta.category) formData.append('category', meta.category);
  formData.append('isPrimary', String(meta.isPrimary ?? false));
  const { data } = await restClient.post('/media/upload', formData);
  return data as Media;
}

export async function createRoomType(hotelId: string, input: RoomTypeInput): Promise<{ id: string }> {
  const { data } = await restClient.post(`/admin/hotels/${hotelId}/room-types`, input);
  return data as { id: string };
}

export async function updateRoomType(id: string, input: RoomTypeInput): Promise<unknown> {
  const { data } = await restClient.put(`/admin/room-types/${id}`, input);
  return data;
}

export async function setRoomTypeAmenities(roomTypeId: string, amenityIds: string[]): Promise<unknown> {
  const { data } = await restClient.put(`/admin/room-types/${roomTypeId}/amenities`, amenityIds);
  return data;
}

export async function setRoomTypeMedia(roomTypeId: string, media: MediaInput[]): Promise<unknown> {
  const { data } = await restClient.put(`/admin/room-types/${roomTypeId}/media`, media);
  return data;
}

export async function createRoom(hotelId: string, input: RoomInput): Promise<{ id: string }> {
  const { data } = await restClient.post(`/admin/hotels/${hotelId}/rooms`, input);
  return data as { id: string };
}

export interface BulkRoomInput {
  roomNumbers?: string[];
  prefix?: string;
  startNumber?: number;
  count?: number;
  floor?: string;
  status?: string;
}

/** Manual-list or pattern-generated batch of rooms for one room type —
    all-or-nothing (`CatalogAdminServiceImpl.bulkCreateRooms`). */
export async function bulkCreateRooms(
  hotelId: string,
  roomTypeId: string,
  input: BulkRoomInput,
): Promise<{ id: string; roomNumber: string }[]> {
  const { data } = await restClient.post(`/admin/hotels/${hotelId}/room-types/${roomTypeId}/rooms/bulk`, input);
  return data as { id: string; roomNumber: string }[];
}

export async function updateRoom(id: string, input: RoomInput): Promise<unknown> {
  const { data } = await restClient.put(`/admin/rooms/${id}`, input);
  return data;
}

/**
 * Room-type media upload works around a live backend defect (investigation
 * report §Q-5): `MediaStorageServiceImpl` accepts only `ownerType`
 * "platform" or "hotel" — "room_type" is rejected — so a room type's
 * gallery cannot be uploaded to directly. This uploads against the hotel,
 * then attaches the returned media to the room type's media list via the
 * normal replace-list PUT.
 */
export async function uploadRoomTypeImage(
  hotelId: string,
  roomTypeId: string,
  file: File,
  currentMedia: MediaInput[],
  meta: { altText?: string; isPrimary?: boolean },
): Promise<Media> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('ownerType', 'hotel');
  formData.append('ownerId', hotelId);
  if (meta.altText) formData.append('altText', meta.altText);
  formData.append('isPrimary', String(meta.isPrimary ?? false));
  const { data: uploaded } = await restClient.post('/media/upload', formData);
  const media = uploaded as Media;
  const nextMedia: MediaInput[] = [
    ...currentMedia,
    {
      url: media.url,
      altText: media.altText ?? undefined,
      category: media.category ?? undefined,
      isPrimary: media.isPrimary,
      sortOrder: media.sortOrder,
    },
  ];
  await setRoomTypeMedia(roomTypeId, nextMedia);
  return media;
}

export async function deleteMedia(id: string): Promise<void> {
  await restClient.delete(`/media/${id}`);
}

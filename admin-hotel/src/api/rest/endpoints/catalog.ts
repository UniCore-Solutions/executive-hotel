import { restClient } from '../client';
import type { Media } from '@/graphql/generated/graphql';

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

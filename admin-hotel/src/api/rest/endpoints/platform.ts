import { restClient } from '../client';
import type { Media } from '@/graphql/generated/graphql';
import type { MediaInput } from './catalog';

export interface PlatformInput {
  name?: string;
  tagline?: string;
  description?: string;
  status?: string;
  defaultCurrency?: string;
  contactEmail?: string;
  contactPhone?: string;
}

// There is exactly one platform row in this single-tenant deployment
// (AdminPlatformRestController — new, backend-hotel). Authorization
// (super_admin only) is enforced server-side; a non-super_admin gets 403.

export async function updatePlatform(id: string, input: PlatformInput): Promise<unknown> {
  const { data } = await restClient.put(`/admin/platform/${id}`, input);
  return data;
}

export async function setPlatformMedia(platformId: string, media: MediaInput[]): Promise<unknown> {
  const { data } = await restClient.put(`/admin/platform/${platformId}/media`, media);
  return data;
}

/**
 * Platform-level media upload, same shape as `uploadHotelImage`:
 * `MediaStorageServiceImpl.Owner.of` natively accepts ownerType "platform",
 * so this is just the upload — no follow-up replace-list call needed to
 * attach it (verified against backend source: only "room_type" needs the
 * upload-then-attach workaround).
 */
export async function uploadPlatformImage(
  platformId: string,
  file: File,
  meta: { altText?: string; category?: string; isPrimary?: boolean },
): Promise<Media> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('ownerType', 'platform');
  formData.append('ownerId', platformId);
  if (meta.altText) formData.append('altText', meta.altText);
  if (meta.category) formData.append('category', meta.category);
  formData.append('isPrimary', String(meta.isPrimary ?? false));
  const { data } = await restClient.post('/media/upload', formData);
  return data as Media;
}

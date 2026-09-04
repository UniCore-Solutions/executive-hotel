import { restClient } from '../client';
import type { Amenity } from '@/graphql/generated/graphql';

export interface AmenityInput {
  name?: string;
  icon?: string;
  category?: string;
  isActive?: boolean;
}

/** Amenity catalog CRUD (create/edit/activate-deactivate the shared
    catalog itself) — distinct from `setHotelAmenities`/`setRoomTypeAmenities`
    in `catalog.ts`, which link existing catalog entries to a hotel/room
    type. super_admin-gated server-side (`AmenityAdminService`). */
export async function createAmenity(input: AmenityInput): Promise<Amenity> {
  const { data } = await restClient.post('/admin/amenities', input);
  return data as Amenity;
}

export async function updateAmenity(id: string, input: AmenityInput): Promise<Amenity> {
  const { data } = await restClient.put(`/admin/amenities/${id}`, input);
  return data as Amenity;
}

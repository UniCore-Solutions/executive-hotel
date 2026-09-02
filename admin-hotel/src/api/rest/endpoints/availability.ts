import { restClient } from '../client';
import type { AvailabilityRow } from '@/graphql/generated/graphql';

/**
 * Back-office availability write (sparse inventory model, see the
 * `AvailabilityAdminServiceImpl` doc comment): updates `outOfOrder` and/or
 * `blocked` unit counts for a room type across a date range in one call.
 * `totalInventory` is accepted by the backend too, but this app never sends
 * it here — total inventory is edited on the room type itself (adding/
 * removing physical rooms), never as a side effect of blocking dates.
 */
export interface AvailabilityRangeInput {
  roomTypeId: string;
  fromDate: string;
  toDate: string;
  outOfOrder?: number;
  blocked?: number;
}

export async function updateAvailabilityRange(
  hotelId: string,
  input: AvailabilityRangeInput,
): Promise<AvailabilityRow[]> {
  const { data } = await restClient.put(`/admin/availability/hotels/${hotelId}`, input);
  return data as AvailabilityRow[];
}

import { restClient } from '../client';

export async function adminCancelReservation(
  reservationId: string,
  input: { reasonCode?: string; reasonNote?: string },
): Promise<unknown> {
  const { data } = await restClient.post(`/admin/reservations/${reservationId}/cancel`, input);
  return data;
}

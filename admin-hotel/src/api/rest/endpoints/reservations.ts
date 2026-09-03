import { restClient } from '../client';

export async function adminCancelReservation(
  reservationId: string,
  input: { reasonCode?: string; reasonNote?: string },
): Promise<unknown> {
  const { data } = await restClient.post(`/admin/reservations/${reservationId}/cancel`, input);
  return data;
}

export interface DownloadedPdf {
  content: ArrayBuffer;
  filename: string;
}

/** Parses `attachment; filename="INV-XXXX.pdf"` — falls back to a generic
    name if the header is missing or unparsable rather than failing the
    download. */
function filenameFromContentDisposition(header: string | undefined, fallback: string): string {
  const match = header?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}

/** Get-or-generate — idempotent, hotel-scoped staff access enforced
    server-side; the backend renders and stores the PDF (or reuses the one
    already stored) and streams it back. */
export async function adminDownloadInvoicePdf(reservationId: string): Promise<DownloadedPdf> {
  const response = await restClient.get(`/admin/reservations/${reservationId}/invoice/pdf`, {
    responseType: 'arraybuffer',
  });
  return {
    content: response.data as ArrayBuffer,
    filename: filenameFromContentDisposition(response.headers['content-disposition'], 'invoice.pdf'),
  };
}

/** Read-only — a credit note is issued automatically on cancellation, never
    on demand. Throws (404) if none exists for this reservation. */
export async function adminDownloadCreditNotePdf(reservationId: string): Promise<DownloadedPdf> {
  const response = await restClient.get(`/admin/reservations/${reservationId}/credit-note/pdf`, {
    responseType: 'arraybuffer',
  });
  return {
    content: response.data as ArrayBuffer,
    filename: filenameFromContentDisposition(response.headers['content-disposition'], 'credit-note.pdf'),
  };
}

/** Assigns a physical room to one room line. 409s (surfaced as ApiError with
    code CONFLICT) if the room is already assigned to an overlapping stay. */
export async function assignRoom(
  reservationId: string,
  roomLineId: string,
  roomId: string,
): Promise<unknown> {
  const { data } = await restClient.post(
    `/admin/reservations/${reservationId}/rooms/${roomLineId}/assign-room`,
    { roomId },
  );
  return data;
}

/** 409s if any room line still has no room assigned. */
export async function checkIn(reservationId: string): Promise<unknown> {
  const { data } = await restClient.post(`/admin/reservations/${reservationId}/check-in`);
  return data;
}

/** 409s unless the reservation is currently checked in. */
export async function checkOut(reservationId: string): Promise<unknown> {
  const { data } = await restClient.post(`/admin/reservations/${reservationId}/check-out`);
  return data;
}

export interface EligibleRoom {
  id: string;
  roomNumber: string;
  floor?: string | null;
}

/** Active rooms of this room type free of conflicting occupancy for
    [checkIn, checkOut) — backs the assign-room picker. Read-only, so it
    goes straight to the backend rather than through TanStack Query's
    mutation lifecycle (this app's read cache is Apollo, but this data has
    no GraphQL equivalent — see graphql-contract skill). */
export async function eligibleRooms(
  roomTypeId: string,
  checkIn: string,
  checkOut: string,
): Promise<EligibleRoom[]> {
  const { data } = await restClient.get(`/admin/room-types/${roomTypeId}/rooms/eligible`, {
    params: { checkIn, checkOut },
  });
  return data as EligibleRoom[];
}

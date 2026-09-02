import { restClient } from './client';
import { TRANSACTION_CURRENCY } from '@/services/graphqlClient';

/**
 * Typed REST operations — the write/action counterpart of the GraphQL
 * query layer. Every function here is a thin, typed wrapper over
 * `restClient` (→ /api/rest BFF → backend). Callers (services, hooks)
 * never touch axios directly.
 *
 * Money rule: every transaction call hardcodes TRANSACTION_CURRENCY (MAD) —
 * the guest's display currency must never leak into a write.
 */

export interface GuestInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  countryCode?: string;
}

export interface ReservationRoomSpec {
  roomTypeId: string;
  ratePlanId: string;
}

export interface ReservationExtraSpec {
  extraId: string;
  quantity: number;
}

export interface ReservationCreated {
  /** Backend Reservation entity as JSON (id, reference, status, amounts, ...). */
  reservation: Record<string, unknown> & { id: string; reference: string };
  /** true when the reservation was newly created (HTTP 201); false on an
      idempotent replay of the same Idempotency-Key (HTTP 200). */
  created: boolean;
}

export interface ReservationCancelled {
  id: string;
  reference: string;
  status: string;
}

export async function createReservation(input: {
  hotelId: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  guest: GuestInfo;
  rooms: ReservationRoomSpec[];
  extras?: ReservationExtraSpec[];
  promoCode?: string;
  arrivalSlot?: string;
  specialRequests?: string;
  idempotencyKey: string;
}): Promise<ReservationCreated> {
  const response = await restClient.post('/v1/reservations', {
    hotelId: input.hotelId,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    adults: input.adults,
    children: input.children,
    currencyCode: TRANSACTION_CURRENCY,
    guest: input.guest,
    rooms: input.rooms,
    extras: input.extras ?? [],
    promoCode: input.promoCode,
    arrivalSlot: input.arrivalSlot,
    specialRequests: input.specialRequests,
    idempotencyKey: input.idempotencyKey,
  }, {
    headers: { 'Idempotency-Key': input.idempotencyKey },
  });
  return {
    reservation: response.data as ReservationCreated['reservation'],
    created: response.status === 201,
  };
}

export async function cancelReservation(input: {
  reference: string;
  email: string;
  reasonCode?: string;
  reasonNote?: string;
}): Promise<ReservationCancelled> {
  const response = await restClient.post(`/v1/reservations/${encodeURIComponent(input.reference)}/cancel`, {
    email: input.email,
    reasonCode: input.reasonCode,
    reasonNote: input.reasonNote,
  });
  return response.data as ReservationCancelled;
}

export interface PaymentCreated {
  id: string;
  status: string;
}

export async function createPayment(input: {
  reservationId: string;
  amount: number;
  provider: string;
  idempotencyKey: string;
  guestEmail?: string;
}): Promise<PaymentCreated> {
  const response = await restClient.post('/v1/payments', {
    reservationId: input.reservationId,
    amount: input.amount,
    currencyCode: TRANSACTION_CURRENCY,
    provider: input.provider,
    idempotencyKey: input.idempotencyKey,
    guestEmail: input.guestEmail,
  });
  return response.data as PaymentCreated;
}

export async function capturePayment(input: {
  paymentId: string;
  gatewayReference?: string;
  guestEmail?: string;
}): Promise<PaymentCreated> {
  const response = await restClient.post(`/v1/payments/${input.paymentId}/capture`, {
    gatewayReference: input.gatewayReference,
    guestEmail: input.guestEmail,
  });
  return response.data as PaymentCreated;
}

export interface InvoiceItem {
  description: string;
  itemType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  billingName: string;
  currencyCode: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  feeAmount: number;
  totalAmount: number;
  status: string;
  issuedAt: string;
  items: InvoiceItem[];
}

/** Get-or-create — idempotent, so calling this to "download" is safe even if
    the reservation's invoice hasn't auto-issued yet for some reason. */
export async function issueInvoice(reference: string, email: string): Promise<InvoiceData> {
  const response = await restClient.post(`/v1/reservations/${encodeURIComponent(reference)}/invoice`, {
    email,
  });
  return response.data as InvoiceData;
}

export interface CreditNoteData {
  creditNoteNumber: string;
  billingName: string;
  currencyCode: string;
  originalAmount: number;
  penaltyAmount: number;
  creditedAmount: number;
  status: string;
  issuedAt: string;
}

/** Read-only — a credit note is issued automatically on cancellation, never
    on demand. Throws (404) if the reservation was never cancelled, or was
    cancelled without ever having an invoice to adjust. */
export async function getCreditNote(reference: string, email: string): Promise<CreditNoteData> {
  const response = await restClient.post(`/v1/reservations/${encodeURIComponent(reference)}/credit-note`, {
    email,
  });
  return response.data as CreditNoteData;
}

export async function updateMyProfile(input: {
  firstName?: string;
  lastName?: string;
  phone?: string;
}): Promise<{ userId: string }> {
  const response = await restClient.post('/v1/auth/me/profile', input);
  return response.data as { userId: string };
}

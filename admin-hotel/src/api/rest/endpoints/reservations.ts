import { restClient } from '../client';

export async function adminCancelReservation(
  reservationId: string,
  input: { reasonCode?: string; reasonNote?: string },
): Promise<unknown> {
  const { data } = await restClient.post(`/admin/reservations/${reservationId}/cancel`, input);
  return data;
}

export interface AdminInvoiceData {
  invoiceNumber: string;
  billingName: string;
  currencyCode: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  feeAmount: number;
  totalAmount: number;
  issuedAt: string;
  items: { description: string; quantity: number; unitPrice: number; totalPrice: number }[];
}

/** Get-or-create — idempotent, hotel-scoped staff access enforced server-side. */
export async function adminGetInvoice(reservationId: string): Promise<AdminInvoiceData> {
  const { data } = await restClient.get(`/admin/reservations/${reservationId}/invoice`);
  return data as AdminInvoiceData;
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
  const { data } = await restClient.get(`/admin/reservations/${reservationId}/credit-note`);
  return data as AdminCreditNoteData;
}

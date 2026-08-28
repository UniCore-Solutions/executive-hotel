/** Payment service — REST writes (API rule: GraphQL = READ, REST = WRITE). */
import { capturePayment, createPayment } from '@/api/rest/endpoints';
import type { PaymentResult } from '@/types';

/**
 * Charge a card for a reservation.
 * Creates a payment record and immediately captures it via the backend
 * (POST /api/v1/payments + /payments/{id}/capture).
 * The backend's PaymentService handles the actual (mock) capture logic.
 *
 * `idempotencyKey` must be stable across retries of the *same* payment
 * attempt (callers derive it from the reservation's own idempotency key —
 * see BookingFlow.tsx) so a retried submit resolves to the same payment
 * instead of creating a duplicate. `guestEmail` is the proof of possession
 * required for an accountless (not-signed-in) checkout — the backend
 * accepts it in place of an authenticated owner/staff session, mirroring
 * the reference+email pattern reservation lookup/cancel already uses.
 * Transaction currency is always MAD — never the guest's display currency.
 */
export async function charge(input: {
  reservationId: string;
  amount: number;
  card: string;
  idempotencyKey: string;
  guestEmail?: string;
}): Promise<PaymentResult> {
  try {
    // Step 1: Create payment record
    const payment = await createPayment({
      reservationId: input.reservationId,
      amount: input.amount,
      provider: 'card',
      idempotencyKey: input.idempotencyKey,
      guestEmail: input.guestEmail,
    });

    // Step 2: Capture the payment
    const captured = await capturePayment({
      paymentId: payment.id,
      guestEmail: input.guestEmail,
    });

    if (captured.status === 'captured') {
      return { ok: true, message: 'Payment authorised' };
    }
    return { ok: false, message: `Payment ${captured.status}. Please try another card.` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Payment failed';
    return { ok: false, message: msg };
  }
}

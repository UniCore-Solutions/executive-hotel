/** Payment service — REST writes (API rule: GraphQL = READ, REST = WRITE).
    The backend is authoritative and asynchronous: creating a payment never
    tells us the outcome, it only starts one. See usePaymentStatus for how
    the outcome is discovered. */
import { createPayment } from '@/api/rest/endpoints';

/**
 * Starts a payment attempt for a reservation and returns immediately with
 * {@code pending} — it does NOT wait for, or itself decide, the outcome.
 * The backend schedules its own simulated provider settlement (or, for a
 * real gateway, would await its webhook) and moves the payment to
 * `captured`/`failed` on its own schedule; the caller must poll for that via
 * `usePaymentStatus` (reservation-level) or `getPaymentStatus` (this one
 * attempt). The frontend never marks a payment successful itself.
 *
 * `idempotencyKey` must be stable across retries of the *same* attempt
 * (callers derive it from the reservation's own idempotency key — see
 * BookingFlow.tsx) so a retried submit resolves to the same payment instead
 * of creating a duplicate. `guestEmail` is the proof of possession required
 * for an accountless (not-signed-in) checkout. Transaction currency is
 * always MAD — never the guest's display currency.
 */
export async function startPaymentAttempt(input: {
  reservationId: string;
  amount: number;
  idempotencyKey: string;
  guestEmail?: string;
}): Promise<{ paymentId: string }> {
  const payment = await createPayment({
    reservationId: input.reservationId,
    amount: input.amount,
    provider: 'card',
    idempotencyKey: input.idempotencyKey,
    guestEmail: input.guestEmail,
  });
  return { paymentId: payment.id };
}

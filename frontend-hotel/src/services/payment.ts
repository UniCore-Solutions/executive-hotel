/** Payment service — calls backend GraphQL API. */
import { gqlRequest, TRANSACTION_CURRENCY } from './graphqlClient';
import type { PaymentResult } from '@/types';
import type {
  CreatePaymentMutation,
  CreatePaymentMutationVariables,
  CapturePaymentMutation,
  CapturePaymentMutationVariables,
} from '@/graphql/generated/graphql';
import { CreatePaymentDocument, CapturePaymentDocument } from '@/graphql/generated/graphql';

/**
 * Charge a card for a reservation.
 * Creates a payment record and immediately captures it via the backend.
 * The backend's PaymentService handles the actual (mock) capture logic.
 *
 * `idempotencyKey` must be stable across retries of the *same* payment
 * attempt (callers derive it from the reservation's own idempotency key —
 * see BookingFlow.tsx) so a retried submit resolves to the same payment
 * instead of creating a duplicate. `guestEmail` is the proof of possession
 * required for an accountless (not-signed-in) checkout — the backend
 * accepts it in place of an authenticated owner/staff session, mirroring
 * the reference+email pattern reservation lookup/cancel already uses.
 * Transaction currency is always MAD (TRANSACTION_CURRENCY) — never the
 * guest's selected display currency.
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
    const createData = await gqlRequest(CreatePaymentDocument, {
      input: {
        reservationId: input.reservationId,
        amount: input.amount,
        currencyCode: TRANSACTION_CURRENCY,
        provider: 'card',
        idempotencyKey: input.idempotencyKey,
        guestEmail: input.guestEmail,
      },
    } as CreatePaymentMutationVariables);

    const payment = (createData as CreatePaymentMutation).createPayment;

    // Step 2: Capture the payment
    const captureData = await gqlRequest(CapturePaymentDocument, {
      input: { paymentId: payment.id, guestEmail: input.guestEmail },
    } as CapturePaymentMutationVariables);

    const captured = (captureData as CapturePaymentMutation).capturePayment;

    if (captured.status === 'captured') {
      return { ok: true, message: 'Payment authorised' };
    }
    return { ok: false, message: `Payment ${captured.status}. Please try another card.` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Payment failed';
    return { ok: false, message: msg };
  }
}

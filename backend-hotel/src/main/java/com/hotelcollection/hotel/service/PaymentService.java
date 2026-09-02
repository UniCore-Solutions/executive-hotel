package com.hotelcollection.hotel.service;

import java.math.BigDecimal;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Payment;
import com.hotelcollection.hotel.dto.billing.CapturePaymentInput;
import com.hotelcollection.hotel.dto.billing.CreatePaymentInput;

/**
 * Payment use cases. Payments are always against a reservation; the amount
 * is server-validated against the remaining balance. Authorization (owner
 * or hotel staff) is enforced internally.
 */
public interface PaymentService {

	Payment createPayment(CreatePaymentInput in);

	Payment capture(CapturePaymentInput in);

	/** Read-only status check — the polling target for a guest awaiting the
	 * async simulated settlement. Owner/staff/guest-email access enforced
	 * internally, same as {@link #createPayment}/{@link #capture}. */
	Payment getById(UUID paymentId, String guestEmail);

	BigDecimal paidAmount(UUID reservationId);

	/**
	 * Simulated refund (no real gateway, same posture as the mock capture
	 * reference {@link #capture} synthesizes): transitions the reservation's
	 * captured payment(s) to {@code refunded} (amount &gt;= everything
	 * captured) or {@code partially_refunded} (less — e.g. a cancellation
	 * penalty was withheld), records a {@code refund} payment transaction,
	 * and updates the reservation's {@code paymentStatus} to match. A no-op
	 * when {@code amount} is zero/blank or nothing was ever captured — the
	 * caller (cancellation) is expected to have already capped the amount at
	 * what {@link #paidAmount} reports, this is a defensive second check.
	 */
	void refund(UUID reservationId, BigDecimal amount);

	/**
	 * Applies a simulated payment-provider outcome to one payment. Idempotent:
	 * an event for an already-resolved payment (captured or failed) is a
	 * no-op that returns the current row rather than reprocessing it, and a
	 * duplicate {@code providerReference} resolves to the payment that first
	 * claimed it (same mechanism as {@link #capture}). Called by the internal
	 * simulated-settlement scheduler, the shared-secret webhook endpoint, and
	 * {@link #adminSimulateWebhook} — never directly by the guest-facing
	 * client, which only ever sees the resulting {@code pending
	 * -> captured/failed} transition via a status read.
	 *
	 * @param event {@code "payment.succeeded"} or {@code "payment.failed"}
	 */
	Payment processProviderEvent(UUID paymentId, String event, String providerReference);

	/**
	 * Convenience variant of {@link #processProviderEvent} that resolves the
	 * payment from a reservation reference (e.g. {@code RC-9JHD3F}) instead
	 * of requiring the caller to already know the payment's UUID — the
	 * reservation's {@code pending} payment if one exists, otherwise its most
	 * recently created payment. For manual/QA use (the same trust boundary as
	 * {@link #processProviderEvent}: the caller must already be authorized —
	 * webhook secret or staff — before this is reached).
	 */
	Payment processProviderEventByReservationReference(String reservationReference, String event,
			String providerReference);

	/**
	 * Staff-triggered manual webhook simulation for QA — same processing as
	 * {@link #processProviderEvent}, gated by hotel-staff access on the
	 * payment's reservation (checked internally).
	 */
	Payment adminSimulateWebhook(UUID paymentId, String event, String providerReference);

	/** Reference-based convenience variant of {@link #adminSimulateWebhook}. */
	Payment adminSimulateWebhookByReservationReference(String reservationReference, String event,
			String providerReference);
}
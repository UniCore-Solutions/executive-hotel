package com.hotelcollection.hotel.service;

import java.math.BigDecimal;
import java.util.UUID;

import com.hotelcollection.hotel.dto.billing.GeneratedDocument;
import com.hotelcollection.hotel.entity.CreditNote;
import com.hotelcollection.hotel.entity.Invoice;

/** Invoice use cases: idempotent generation for a reservation. */
public interface InvoiceService {

	/**
	 * Guest self-service entry point (reference+email proof). Returns the
	 * existing invoice if one was already issued — including for a
	 * reservation that has since been cancelled, since that invoice was
	 * legitimate at the time it was created. Refuses to issue a <em>new</em>
	 * invoice for a reservation that is currently cancelled.
	 */
	Invoice getOrCreateInvoice(String reservationReference, String guestEmail);

	/**
	 * System-triggered entry point: called once a reservation is confirmed
	 * (pay-at-property at booking time, or on payment capture), no guest
	 * proof required. Idempotent, same as {@link #getOrCreateInvoice}.
	 */
	Invoice issueInvoiceForConfirmedReservation(UUID reservationId);

	/**
	 * Staff entry point (hotel-scoped access enforced internally, same guard
	 * every admin-reachable service method uses). Idempotent, same as
	 * {@link #getOrCreateInvoice} — used by both admin consoles' "download
	 * invoice" action.
	 */
	Invoice getInvoiceForStaff(UUID reservationId);

	/**
	 * Issues a credit note documenting a cancellation's adjustment against
	 * the reservation's invoice — original amount, penalty retained, amount
	 * actually credited back. A no-op (returns {@code null}) when the
	 * reservation never had an invoice to adjust (cancelled before it ever
	 * confirmed). Idempotent, one per reservation. Called once, from
	 * {@code BookingServiceImpl#doCancel} right after the refund it
	 * documents — never issued on demand, since it only ever records
	 * something that already happened.
	 */
	CreditNote issueCreditNoteForCancellation(UUID reservationId, UUID cancellationId,
			BigDecimal penaltyAmount, BigDecimal creditedAmount);

	/** Guest self-service (reference+email proof). {@code NOT_FOUND} if no
	 * credit note exists for this reservation. */
	CreditNote getCreditNote(String reservationReference, String guestEmail);

	/** Staff entry point (hotel-scoped access enforced internally).
	 * {@code NOT_FOUND} if no credit note exists for this reservation. */
	CreditNote getCreditNoteForStaff(UUID reservationId);

	/**
	 * Guest self-service PDF download (reference+email proof) — same
	 * idempotent get-or-create as {@link #getOrCreateInvoice}, plus
	 * idempotent, concurrency-safe PDF generation/reuse: returns the already
	 * -stored PDF when one exists, otherwise generates, stores and persists
	 * it before returning it.
	 */
	GeneratedDocument getInvoicePdfForGuest(String reservationReference, String guestEmail);

	/** Staff PDF download (hotel-scoped access enforced internally); same
	 * generate-or-reuse semantics as {@link #getInvoicePdfForGuest}. */
	GeneratedDocument getInvoicePdfForStaff(UUID reservationId);

	/** Guest self-service credit-note PDF download. {@code NOT_FOUND} if no
	 * credit note exists for this reservation. */
	GeneratedDocument getCreditNotePdfForGuest(String reservationReference, String guestEmail);

	/** Staff credit-note PDF download (hotel-scoped access enforced
	 * internally). {@code NOT_FOUND} if no credit note exists for this
	 * reservation. */
	GeneratedDocument getCreditNotePdfForStaff(UUID reservationId);

	/**
	 * System-triggered entry point (the email Kafka consumer, attaching the
	 * invoice to a confirmation/invoice email) — no guest/staff proof
	 * required, mirroring {@link #issueInvoiceForConfirmedReservation}'s
	 * posture: there is no {@code CurrentUser} in a Kafka listener. Same
	 * idempotent generate-or-reuse semantics as {@link #getInvoicePdfForGuest}.
	 */
	GeneratedDocument getInvoicePdfForNotification(UUID reservationId);

	/** Same system-triggered posture as {@link #getInvoicePdfForNotification}.
	 * {@code NOT_FOUND} if no credit note exists for this reservation. */
	GeneratedDocument getCreditNotePdfForNotification(UUID reservationId);
}
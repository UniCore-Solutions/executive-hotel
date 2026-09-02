package com.hotelcollection.hotel.service;

import java.util.UUID;

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
}
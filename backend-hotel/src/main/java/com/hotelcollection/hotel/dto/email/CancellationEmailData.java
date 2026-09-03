package com.hotelcollection.hotel.dto.email;

/** Template-facing data for {@code email/booking-cancellation}. {@code
 * hasPenalty}/{@code refundable} drive which language the template shows —
 * never implying a refund happened when it did not (the amounts are the
 * authoritative backend figures, not derived in the template). */
public record CancellationEmailData(
		String firstName,
		String reference,
		String checkInDisplay,
		String checkOutDisplay,
		String penaltyDisplay,
		boolean hasPenalty,
		String refundDisplay,
		boolean hasRefund,
		boolean refundable) {
}

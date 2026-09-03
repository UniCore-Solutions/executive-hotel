package com.hotelcollection.hotel.dto.email;

/** Template-facing data for {@code email/payment-failed}. */
public record PaymentFailedEmailData(
		String firstName,
		String reference,
		String totalDisplay,
		String retryUrl,
		String holdExpiresDisplay) {
}

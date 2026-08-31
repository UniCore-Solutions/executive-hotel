package com.hotelcollection.hotel.dto.billing;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * @param simulateOutcome QA-only override for the automatic simulated
 *        settlement: {@code "succeed"} (default when null), {@code "fail"},
 *        or {@code "timeout"} (schedules nothing, exercising the caller's
 *        timeout handling on demand). Never used by the shipped guest client.
 */
public record CreatePaymentInput(UUID reservationId, BigDecimal amount, String currencyCode,
		String provider, String idempotencyKey, String guestEmail, String simulateOutcome) {

	public CreatePaymentInput(UUID reservationId, BigDecimal amount, String currencyCode,
			String provider, String idempotencyKey, String guestEmail) {
		this(reservationId, amount, currencyCode, provider, idempotencyKey, guestEmail, null);
	}
}
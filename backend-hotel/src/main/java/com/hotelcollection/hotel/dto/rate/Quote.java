package com.hotelcollection.hotel.dto.rate;

import java.math.BigDecimal;
import java.util.List;

/**
 * Server-side pricing snapshot.
 *
 * {@code amountDueNow} is what the guest is charged at booking — the whole
 * {@code totalAmount} for a prepaid rate, zero for a pay-at-property one, a
 * share of it for a deposit. {@code paymentTiming} is the rate plan term it
 * was derived from, so clients can explain the figure rather than restate it.
 */
public record Quote(String currencyCode, BigDecimal subtotalAmount, BigDecimal discountAmount,
		BigDecimal taxAmount, BigDecimal feeAmount, BigDecimal totalAmount, BigDecimal originalTotal,
		boolean valid, List<QuoteLine> lines, List<ExtraLineSpec> extras, List<TaxChargeSpec> charges,
		String promoMessage, String paymentTiming, BigDecimal amountDueNow) {
}
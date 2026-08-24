package com.hotelcollection.hotel.dto.rate;

import java.math.BigDecimal;

/** Cancellation policy evaluation result for a booked room line. */
public record CancellationEvaluation(boolean isRefundable, BigDecimal penaltyAmount,
		BigDecimal refundAmount) {
}
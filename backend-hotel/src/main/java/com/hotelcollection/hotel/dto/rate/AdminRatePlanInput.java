package com.hotelcollection.hotel.dto.rate;

import java.math.BigDecimal;

/** Rate plan create/update input (back-office). */
public record AdminRatePlanInput(String name, String code, String currencyCode, String mealPlan,
		String cancellationPolicy, String paymentPolicy, Boolean isRefundable,
		Integer cancellationDeadlineDays, String cancellationPenaltyType,
		BigDecimal cancellationPenaltyValue, String paymentTiming, BigDecimal depositPercentage,
		Integer minStay, Integer maxStay, String status) {
}

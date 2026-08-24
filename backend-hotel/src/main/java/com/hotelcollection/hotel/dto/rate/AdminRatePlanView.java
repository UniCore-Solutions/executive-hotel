package com.hotelcollection.hotel.dto.rate;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Rate plan with its offered (room type, rate plan) links and price ranges. */
public record AdminRatePlanView(UUID id, UUID hotelId, String name, String code,
		String currencyCode, String mealPlan, String cancellationPolicy, String paymentPolicy,
		boolean isRefundable, Integer cancellationDeadlineDays, String cancellationPenaltyType,
		BigDecimal cancellationPenaltyValue, String paymentTiming, BigDecimal depositPercentage,
		Integer minStay, Integer maxStay, String status, List<RoomTypeRatePlanInfoView> links) {
}

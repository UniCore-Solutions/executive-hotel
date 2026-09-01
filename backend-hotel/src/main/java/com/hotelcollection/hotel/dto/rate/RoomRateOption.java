package com.hotelcollection.hotel.dto.rate;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * One offered (room_type, rate_plan) option with its current price.
 *
 * {@code paymentTiming} / {@code depositPercentage} are the rate plan's
 * settlement terms (pay_at_property | prepay_full | prepay_deposit) — carried
 * here so the guest can see, before choosing a rate, whether the stay is paid
 * now or at the property.
 */
public record RoomRateOption(UUID linkId, UUID roomTypeId, UUID ratePlanId, String ratePlanCode,
		String ratePlanName, String mealPlan, BigDecimal pricePerNight, String currencyCode,
		String cancellationPolicy, boolean isRefundable, String paymentTiming,
		BigDecimal depositPercentage) {
}
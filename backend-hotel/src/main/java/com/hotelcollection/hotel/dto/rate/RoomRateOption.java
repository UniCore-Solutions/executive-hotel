package com.hotelcollection.hotel.dto.rate;

import java.math.BigDecimal;
import java.util.UUID;

public record RoomRateOption(UUID linkId, UUID roomTypeId, UUID ratePlanId, String ratePlanCode,
		String ratePlanName, String mealPlan, BigDecimal pricePerNight, String currencyCode,
		String cancellationPolicy, boolean isRefundable) {
}
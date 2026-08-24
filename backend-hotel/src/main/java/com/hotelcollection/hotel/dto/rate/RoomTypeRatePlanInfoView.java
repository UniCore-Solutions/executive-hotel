package com.hotelcollection.hotel.dto.rate;

import java.util.List;
import java.util.UUID;

/** Offered (room type, rate plan) pair with its price ranges (back-office). */
public record RoomTypeRatePlanInfoView(UUID id, UUID roomTypeId, String roomTypeName,
		UUID ratePlanId, String currencyCode, List<RatePlanPriceInfoView> prices) {
}

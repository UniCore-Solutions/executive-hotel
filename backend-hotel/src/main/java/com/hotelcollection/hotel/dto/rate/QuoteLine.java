package com.hotelcollection.hotel.dto.rate;

import java.math.BigDecimal;
import java.util.UUID;

public record QuoteLine(UUID roomTypeId, UUID ratePlanId, BigDecimal ratePerNight, int nights,
		BigDecimal subtotalAmount) {
}
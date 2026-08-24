package com.hotelcollection.hotel.dto.rate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Base price by inclusive date range (back-office pricing editor). */
public record RatePlanPriceInfoView(UUID id, LocalDate validFrom, LocalDate validTo,
		BigDecimal priceAmount) {
}

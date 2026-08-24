package com.hotelcollection.hotel.dto.rate;

import java.math.BigDecimal;
import java.time.LocalDate;

/** One price range for an offered pair (back-office). Inclusive bounds, no overlaps. */
public record RatePlanPriceInput(LocalDate validFrom, LocalDate validTo,
		BigDecimal priceAmount) {
}

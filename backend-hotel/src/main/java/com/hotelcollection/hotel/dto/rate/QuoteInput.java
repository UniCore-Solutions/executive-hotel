package com.hotelcollection.hotel.dto.rate;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record QuoteInput(UUID hotelId, LocalDate checkInDate, LocalDate checkOutDate, int adults,
		int children, String currencyCode, List<QuoteLineInput> rooms, List<QuoteExtraInput> extras,
		String promoCode) {
}
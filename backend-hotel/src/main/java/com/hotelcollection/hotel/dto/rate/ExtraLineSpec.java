package com.hotelcollection.hotel.dto.rate;

import java.math.BigDecimal;
import java.util.UUID;

/** One persisted extra line: an extra snapshot for a booking. */
public record ExtraLineSpec(UUID extraId, int quantity, BigDecimal unitPrice, BigDecimal totalPrice,
		boolean perNight) {
}
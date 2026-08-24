package com.hotelcollection.hotel.dto.billing;

import java.math.BigDecimal;
import java.util.UUID;

public record CreatePaymentInput(UUID reservationId, BigDecimal amount, String currencyCode,
		String provider) {
}
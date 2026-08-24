package com.hotelcollection.hotel.dto.rate;

import java.time.LocalDate;
import java.util.UUID;

public record RatesInput(UUID hotelId, UUID roomTypeId, LocalDate checkInDate,
		LocalDate checkOutDate, int adults, int children) {
}
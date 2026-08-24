package com.hotelcollection.hotel.dto.availability;

import java.time.LocalDate;
import java.util.UUID;

public record AvailabilityInput(UUID hotelId, LocalDate checkInDate, LocalDate checkOutDate,
		int adults, int children, int rooms) {
}
package com.hotelcollection.hotel.dto.availability;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Single-roundtrip search input: hotels + availability + rates + room types
 * for one hotel (hotelId set) or all active hotels (hotelId null).
 */
public record StaySearchInput(UUID hotelId, LocalDate checkInDate, LocalDate checkOutDate,
		int adults, int children, int rooms) {
}

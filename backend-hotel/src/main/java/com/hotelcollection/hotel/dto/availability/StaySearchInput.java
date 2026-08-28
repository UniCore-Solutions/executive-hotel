package com.hotelcollection.hotel.dto.availability;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Single-roundtrip search input: hotels + availability + rates + room types.
 * Single-hotel platform: hotelId null resolves to the canonical hotel (the
 * one active hotel); hotelId selects that hotel explicitly.
 */
public record StaySearchInput(UUID hotelId, LocalDate checkInDate, LocalDate checkOutDate,
		int adults, int children, int rooms) {
}

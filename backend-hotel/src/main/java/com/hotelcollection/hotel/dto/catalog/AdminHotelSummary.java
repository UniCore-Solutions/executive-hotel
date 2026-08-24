package com.hotelcollection.hotel.dto.catalog;
import java.util.UUID;

/** Compact hotel row for the back-office hotel list. */
public record AdminHotelSummary(UUID id, String name, String brand, String city,
		String countryCode, String status, Integer starRating, long roomTypeCount,
		long activeReservations) {
}

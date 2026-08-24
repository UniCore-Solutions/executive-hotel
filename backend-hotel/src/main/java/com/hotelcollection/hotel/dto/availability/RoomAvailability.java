package com.hotelcollection.hotel.dto.availability;
import java.util.UUID;

public record RoomAvailability(UUID roomTypeId, boolean available, AvailabilityStatus status,
		boolean capacityFits) {
}
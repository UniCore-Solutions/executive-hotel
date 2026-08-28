package com.hotelcollection.hotel.dto.availability;
import java.util.UUID;

/**
 * Availability of a room type for a requested stay. {@code free} is the
 * number of physical rooms of that type that remain available on the
 * tightest night of the stay (physical inventory minus sold/out-of-order/
 * blocked units, per the canonical inventory model).
 */
public record RoomAvailability(UUID roomTypeId, boolean available, AvailabilityStatus status,
		boolean capacityFits, int free) {
}
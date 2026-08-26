package com.hotelcollection.hotel.dto.availability;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.dto.rate.RoomRateOption;
import com.hotelcollection.hotel.entity.RoomType;

/**
 * One bookable room type within a stay search: catalog data, live availability
 * verdict and rate options for the requested dates, with its hotel reference.
 */
public record StaySearchRoom(UUID hotelId, String hotelName, RoomType roomType,
		AvailabilityStatus status, boolean capacityFits, List<RoomRateOption> rates) {
}

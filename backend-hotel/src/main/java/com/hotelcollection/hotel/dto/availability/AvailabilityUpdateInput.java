package com.hotelcollection.hotel.dto.availability;
import com.hotelcollection.hotel.entity.Availability;

import java.time.LocalDate;
import java.util.UUID;

/** Availability update for one room type on one date. Null fields stay unchanged. */
public record AvailabilityUpdateInput(UUID roomTypeId, LocalDate stayDate,
		Integer totalInventory, Integer outOfOrder, Integer blocked) {
}

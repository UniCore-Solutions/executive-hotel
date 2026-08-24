package com.hotelcollection.hotel.dto.availability;

import java.time.LocalDate;
import java.util.UUID;

/** Range-based availability update (sparse inventory). Null fields stay unchanged. */
public record AvailabilityRangeInput(UUID roomTypeId, LocalDate fromDate, LocalDate toDate,
		Integer totalInventory, Integer outOfOrder, Integer blocked) {
}
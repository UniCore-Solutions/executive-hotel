package com.hotelcollection.hotel.dto.catalog;

import java.time.LocalDate;

/** Season create/update input. Nullable fields stay unchanged on update. */
public record AdminSeasonInput(String name, String seasonType, LocalDate startDate, LocalDate endDate,
		Boolean isActive, String color, String notes) {
}

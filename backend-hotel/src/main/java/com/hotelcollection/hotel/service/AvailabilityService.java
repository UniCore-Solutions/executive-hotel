package com.hotelcollection.hotel.service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import com.hotelcollection.hotel.dto.availability.AvailabilityInput;
import com.hotelcollection.hotel.dto.availability.RoomAvailability;
import com.hotelcollection.hotel.entity.Availability;

/** Availability read use cases (single inventory source, C9). */
public interface AvailabilityService {

	List<RoomAvailability> check(AvailabilityInput in);

	/** Inventory rows of a hotel for the given range (admin back-office read). */
	List<com.hotelcollection.hotel.entity.Availability> range(UUID hotelId,
			LocalDate from, LocalDate to);

	/**
	 * Highest combined (sold + out_of_order + blocked) across all nights of a
	 * room type — the floor below which total_inventory cannot be reduced.
	 */
	int maxSoldUnits(UUID roomTypeId);
}
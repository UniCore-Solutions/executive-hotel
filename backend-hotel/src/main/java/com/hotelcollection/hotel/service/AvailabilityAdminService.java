package com.hotelcollection.hotel.service;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Availability;
import com.hotelcollection.hotel.dto.availability.AvailabilityRangeInput;
import com.hotelcollection.hotel.dto.availability.AvailabilityUpdateInput;

/**
 * Back-office availability write use cases (sparse inventory model).
 * Authorization (hotel scoping) is enforced internally.
 */
public interface AvailabilityAdminService {

	List<Availability> updateAvailability(UUID hotelId, List<AvailabilityUpdateInput> rows);

	List<Availability> updateAvailabilityRange(UUID hotelId, AvailabilityRangeInput in);
}
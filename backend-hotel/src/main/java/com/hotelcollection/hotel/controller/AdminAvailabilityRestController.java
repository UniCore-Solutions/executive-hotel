package com.hotelcollection.hotel.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hotelcollection.hotel.dto.availability.AvailabilityRangeInput;
import com.hotelcollection.hotel.entity.Availability;
import com.hotelcollection.hotel.service.AvailabilityAdminService;

/**
 * Back-office availability write endpoint (sparse inventory model).
 * Authorization (hotel scoping) is enforced inside
 * {@link AvailabilityAdminService}.
 */
@RestController
@RequestMapping("/api/v1/admin/availability")
public class AdminAvailabilityRestController {

	private final AvailabilityAdminService availability;

	public AdminAvailabilityRestController(AvailabilityAdminService availability) {
		this.availability = availability;
	}

	@PutMapping("/hotels/{hotelId}")
	public List<Availability> updateAvailabilityRange(@PathVariable UUID hotelId,
			@RequestBody AvailabilityRangeInput in) {
		return availability.updateAvailabilityRange(hotelId, in);
	}
}

package com.hotelcollection.hotel.controller;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hotelcollection.hotel.dto.catalog.AdminAmenityInput;
import com.hotelcollection.hotel.entity.Amenity;
import com.hotelcollection.hotel.service.AmenityAdminService;

/**
 * Amenity catalog write endpoints (create/edit/activate-deactivate). Reads
 * go through GraphQL (`adminAmenities`, per this platform's GraphQL=read/
 * REST=write split) — authorization (any hotel_admin, or super_admin) is
 * enforced inside {@link AmenityAdminService}.
 */
@RestController
@RequestMapping("/api/v1/admin/amenities")
public class AdminAmenityRestController {

	private final AmenityAdminService amenityAdmin;

	public AdminAmenityRestController(AmenityAdminService amenityAdmin) {
		this.amenityAdmin = amenityAdmin;
	}

	@PostMapping
	public ResponseEntity<Amenity> createAmenity(@RequestBody AdminAmenityInput in) {
		return ResponseEntity.status(HttpStatus.CREATED).body(amenityAdmin.createAmenity(in));
	}

	@PutMapping("/{id}")
	public Amenity updateAmenity(@PathVariable UUID id, @RequestBody AdminAmenityInput in) {
		return amenityAdmin.updateAmenity(id, in);
	}
}

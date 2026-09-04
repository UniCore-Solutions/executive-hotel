package com.hotelcollection.hotel.controller;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hotelcollection.hotel.dto.catalog.AdminSeasonInput;
import com.hotelcollection.hotel.entity.Season;
import com.hotelcollection.hotel.service.SeasonService;

/**
 * Season write endpoints (reads go through GraphQL — `adminSeasons(hotelId)`
 * — per this platform's GraphQL=read/REST=write split). Authorization
 * (hotel-scoped staff or super_admin) is enforced inside {@link SeasonService}.
 */
@RestController
public class AdminSeasonRestController {

	private final SeasonService seasons;

	public AdminSeasonRestController(SeasonService seasons) {
		this.seasons = seasons;
	}

	@PostMapping("/api/v1/admin/hotels/{hotelId}/seasons")
	public ResponseEntity<Season> createSeason(@PathVariable UUID hotelId, @RequestBody AdminSeasonInput in) {
		return ResponseEntity.status(HttpStatus.CREATED).body(seasons.createSeason(hotelId, in));
	}

	@PutMapping("/api/v1/admin/seasons/{id}")
	public Season updateSeason(@PathVariable UUID id, @RequestBody AdminSeasonInput in) {
		return seasons.updateSeason(id, in);
	}

	@DeleteMapping("/api/v1/admin/seasons/{id}")
	public ResponseEntity<Void> deleteSeason(@PathVariable UUID id) {
		seasons.deleteSeason(id);
		return ResponseEntity.noContent().build();
	}
}

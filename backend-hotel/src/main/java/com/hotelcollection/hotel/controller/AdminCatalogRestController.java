package com.hotelcollection.hotel.controller;

import java.util.List;
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

import com.hotelcollection.hotel.dto.catalog.AdminHotelInput;
import com.hotelcollection.hotel.dto.catalog.AdminRoomInput;
import com.hotelcollection.hotel.dto.catalog.AdminRoomTypeInput;
import com.hotelcollection.hotel.dto.catalog.HotelPolicyInput;
import com.hotelcollection.hotel.dto.media.MediaInput;
import com.hotelcollection.hotel.entity.Amenity;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.HotelPolicy;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.entity.Room;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.service.CatalogAdminService;

/**
 * Back-office catalog write endpoints (hotels, room types, rooms, amenity &
 * media & policy associations). Authorization (hotel scoping / super_admin)
 * is enforced inside {@link CatalogAdminService}.
 */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminCatalogRestController {

	private final CatalogAdminService catalog;

	public AdminCatalogRestController(CatalogAdminService catalog) {
		this.catalog = catalog;
	}

	// ---------------------------------------------------------------- hotels

	@PostMapping("/hotels")
	public ResponseEntity<Hotel> createHotel(@RequestBody AdminHotelInput in) {
		return ResponseEntity.status(HttpStatus.CREATED).body(catalog.createHotel(in));
	}

	@PutMapping("/hotels/{id}")
	public Hotel updateHotel(@PathVariable UUID id, @RequestBody AdminHotelInput in) {
		return catalog.updateHotel(id, in);
	}

	@PutMapping("/hotels/{id}/amenities")
	public List<Amenity> setHotelAmenities(@PathVariable UUID id,
			@RequestBody List<UUID> amenityIds) {
		return catalog.setHotelAmenities(id, amenityIds);
	}

	@PutMapping("/hotels/{id}/media")
	public List<Media> setHotelMedia(@PathVariable UUID id, @RequestBody List<MediaInput> media) {
		return catalog.setHotelMedia(id, media);
	}

	@PutMapping("/hotels/{id}/policies")
	public List<HotelPolicy> setHotelPolicies(@PathVariable UUID id,
			@RequestBody List<HotelPolicyInput> policies) {
		return catalog.setHotelPolicies(id, policies);
	}

	// ---------------------------------------------------------------- room types

	@PostMapping("/hotels/{hotelId}/room-types")
	public ResponseEntity<RoomType> createRoomType(@PathVariable UUID hotelId,
			@RequestBody AdminRoomTypeInput in) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(catalog.createRoomType(hotelId, in));
	}

	@PutMapping("/room-types/{id}")
	public RoomType updateRoomType(@PathVariable UUID id, @RequestBody AdminRoomTypeInput in) {
		return catalog.updateRoomType(id, in);
	}

	@PutMapping("/room-types/{id}/amenities")
	public List<Amenity> setRoomTypeAmenities(@PathVariable UUID id,
			@RequestBody List<UUID> amenityIds) {
		return catalog.setRoomTypeAmenities(id, amenityIds);
	}

	@PutMapping("/room-types/{id}/media")
	public List<Media> setRoomTypeMedia(@PathVariable UUID id, @RequestBody List<MediaInput> media) {
		return catalog.setRoomTypeMedia(id, media);
	}

	// ---------------------------------------------------------------- rooms

	@PostMapping("/hotels/{hotelId}/rooms")
	public ResponseEntity<Room> createRoom(@PathVariable UUID hotelId,
			@RequestBody AdminRoomInput in) {
		return ResponseEntity.status(HttpStatus.CREATED).body(catalog.createRoom(hotelId, in));
	}

	@PutMapping("/rooms/{id}")
	public Room updateRoom(@PathVariable UUID id, @RequestBody AdminRoomInput in) {
		return catalog.updateRoom(id, in);
	}
}

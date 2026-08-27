package com.hotelcollection.hotel.dto.catalog;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Amenity;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.entity.Room;

/** Room type with its physical rooms, amenities and media (back-office). */
public record AdminRoomTypeView(UUID id, UUID hotelId, String name, String slug, String description,
		Integer maxAdults, Integer maxChildren, Integer totalInventory, String bedConfiguration,
		BigDecimal sizeSqm, String viewType, String status, List<Amenity> amenities,
		List<Media> media, List<Room> rooms) {
}

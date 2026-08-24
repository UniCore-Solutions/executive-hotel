package com.hotelcollection.hotel.service;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Amenity;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.Room;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.dto.media.MediaInput;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.dto.catalog.AdminHotelInput;
import com.hotelcollection.hotel.dto.catalog.AdminRoomInput;
import com.hotelcollection.hotel.dto.catalog.AdminRoomTypeInput;

/**
 * Back-office catalog write use cases. Authorization (hotel scoping /
 * super_admin) is enforced internally.
 */
public interface CatalogAdminService {

	Hotel createHotel(AdminHotelInput in);

	Hotel updateHotel(UUID id, AdminHotelInput in);

	List<Amenity> setHotelAmenities(UUID hotelId, List<UUID> amenityIds);

	List<Media> setHotelMedia(UUID hotelId, List<MediaInput> media);

	RoomType createRoomType(UUID hotelId, AdminRoomTypeInput in);

	RoomType updateRoomType(UUID id, AdminRoomTypeInput in);

	List<Amenity> setRoomTypeAmenities(UUID roomTypeId, List<UUID> amenityIds);

	List<Media> setRoomTypeMedia(UUID roomTypeId, List<MediaInput> media);

	Room createRoom(UUID hotelId, AdminRoomInput in);

	Room updateRoom(UUID id, AdminRoomInput in);

	List<Amenity> amenityCatalog();

	/** Inventory write for availability management. */
	RoomType setRoomTypeInventory(UUID roomTypeId, int totalInventory);
}
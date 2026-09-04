package com.hotelcollection.hotel.service;

import java.util.UUID;

import com.hotelcollection.hotel.dto.catalog.AdminAmenityInput;
import com.hotelcollection.hotel.entity.Amenity;

/**
 * Write use cases for the shared amenity catalog itself (create/edit/
 * activate-deactivate an amenity definition) — distinct from
 * {@link CatalogAdminService#setHotelAmenities}/{@code setRoomTypeAmenities},
 * which link existing catalog entries to a hotel/room type. Not hotel-scoped
 * (the catalog is shared across every hotel) — any {@code hotel_admin}, not
 * just {@code super_admin}, can add to it, and the addition immediately
 * becomes usable by every other hotel too (task-driven, see
 * docs/ADMIN_REBUILD_PROGRESS.md); authorization is
 * {@code CurrentUserAccessor.requireHotelAdminOrSuperAdmin()}.
 */
public interface AmenityAdminService {

	Amenity createAmenity(AdminAmenityInput in);

	Amenity updateAmenity(UUID id, AdminAmenityInput in);
}

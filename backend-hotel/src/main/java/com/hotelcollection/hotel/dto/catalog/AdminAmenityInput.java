package com.hotelcollection.hotel.dto.catalog;

/** Amenity catalog create/update input. Nullable fields stay unchanged on update. */
public record AdminAmenityInput(String name, String icon, String category, Boolean isActive) {
}

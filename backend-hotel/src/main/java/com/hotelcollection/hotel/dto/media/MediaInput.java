package com.hotelcollection.hotel.dto.media;
import com.hotelcollection.hotel.entity.Media;

/** Media replacement row (back-office): url is required, owner comes from the mutation. */
public record MediaInput(String url, String altText, String category, Boolean isPrimary,
		Integer sortOrder) {
}

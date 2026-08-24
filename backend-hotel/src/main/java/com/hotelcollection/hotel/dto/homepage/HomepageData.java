package com.hotelcollection.hotel.dto.homepage;

import java.util.List;

import com.hotelcollection.hotel.entity.Experience;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.Review;
import com.hotelcollection.hotel.entity.RoomType;

/**
 * Aggregated customer-facing homepage. Sections are curated in the database
 * (is_featured_on_homepage) so the guest frontend never hardcodes content.
 */
public record HomepageData(List<Hotel> featuredHotels, List<RoomType> featuredRoomTypes,
		List<Experience> featuredExperiences, List<Review> featuredReviews) {
}
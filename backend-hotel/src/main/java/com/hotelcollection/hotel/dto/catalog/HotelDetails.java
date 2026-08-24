package com.hotelcollection.hotel.dto.catalog;
import com.hotelcollection.hotel.dto.review.ReviewPage;

import java.util.List;

import com.hotelcollection.hotel.entity.Experience;
import com.hotelcollection.hotel.entity.Faq;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.Restaurant;

public record HotelDetails(Hotel hotel, List<Experience> experiences, List<Restaurant> restaurants,
		List<Faq> faqs, ReviewPage reviews, long reviewsCount, Double averageRating) {
}
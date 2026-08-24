package com.hotelcollection.hotel.dto.catalog;
import com.hotelcollection.hotel.dto.rate.AdminRatePlanView;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Amenity;
import com.hotelcollection.hotel.entity.Availability;
import com.hotelcollection.hotel.entity.Experience;
import com.hotelcollection.hotel.entity.Extra;
import com.hotelcollection.hotel.entity.Faq;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.entity.Restaurant;

/** Back-office hotel workspace: everything a screen needs in one query. */
public record AdminHotel(UUID id, String name, String status, Hotel hotel,
		List<AdminRoomTypeView> roomTypes, List<AdminRatePlanView> ratePlans,
		List<Availability> availability, List<Amenity> amenities, List<Media> media,
		List<Experience> experiences, List<Restaurant> restaurants, List<Faq> faqs,
		List<Extra> extras) {
}

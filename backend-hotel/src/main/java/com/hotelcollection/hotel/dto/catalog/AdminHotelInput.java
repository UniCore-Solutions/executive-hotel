package com.hotelcollection.hotel.dto.catalog;
import com.hotelcollection.hotel.entity.Hotel;

import java.math.BigDecimal;

/** Hotel create/update input (back-office). Nullable fields stay unchanged on update. */
public record AdminHotelInput(String name, String brand, String description,
		String longDescription, String hotelType, String addressLine1, String addressLine2,
		String city, String countryCode, BigDecimal latitude, BigDecimal longitude, String phone,
		String email, Integer starRating, String checkInTime, String checkOutTime,
		String defaultCurrency, String status) {
}

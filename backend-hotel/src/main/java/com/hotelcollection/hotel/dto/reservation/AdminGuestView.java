package com.hotelcollection.hotel.dto.reservation;
import com.hotelcollection.hotel.entity.Guest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Guest with their reservation footprint at a hotel (back-office). */
public record AdminGuestView(UUID id, String firstName, String lastName, String email,
		String phone, String countryCode, long reservationsCount, BigDecimal totalSpent,
		LocalDate lastStayDate) {
}

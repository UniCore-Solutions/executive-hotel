package com.hotelcollection.hotel.dto.reservation;

public record GuestInput(String firstName, String lastName, String email, String phone,
		String countryCode) {
}
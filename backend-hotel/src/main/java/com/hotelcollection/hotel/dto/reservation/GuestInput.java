package com.hotelcollection.hotel.dto.reservation;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record GuestInput(
		@NotBlank(message = "guest.firstName is required") String firstName,
		@NotBlank(message = "guest.lastName is required") String lastName,
		@Email(message = "a valid email address is required") String email,
		String phone,
		String countryCode) {
}

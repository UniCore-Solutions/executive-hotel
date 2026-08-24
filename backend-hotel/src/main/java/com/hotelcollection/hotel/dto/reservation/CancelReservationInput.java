package com.hotelcollection.hotel.dto.reservation;

public record CancelReservationInput(String reference, String email, String reasonCode,
		String reasonNote) {
}
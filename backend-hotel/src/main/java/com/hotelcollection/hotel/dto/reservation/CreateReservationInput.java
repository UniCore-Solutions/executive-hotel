package com.hotelcollection.hotel.dto.reservation;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateReservationInput(UUID hotelId, LocalDate checkInDate, LocalDate checkOutDate,
		int adults, int children, String currencyCode, GuestInput guest, List<RoomInput> rooms,
		List<ExtraInput> extras, String promoCode, String idempotencyKey, String arrivalSlot,
		String specialRequests) {
}
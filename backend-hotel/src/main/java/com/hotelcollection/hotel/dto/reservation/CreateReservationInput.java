package com.hotelcollection.hotel.dto.reservation;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Booking request. Shape constraints are declared here and enforced at the REST
 * edge by {@code @Valid}, so a malformed request is rejected before any service,
 * repository or inventory lock is touched — and reported through the standard
 * {@code ApiError} envelope by {@code GlobalExceptionHandler}.
 *
 * <p>These are <em>shape</em> rules only. Business rules that need the database
 * (does the room type belong to this hotel, does the party fit, is the hotel
 * bookable) stay in {@code BookingServiceImpl}, which remains the authority for
 * every caller — GraphQL and internal callers do not run bean validation.
 */
public record CreateReservationInput(
		@NotNull(message = "hotelId is required") UUID hotelId,
		@NotNull(message = "checkInDate is required") LocalDate checkInDate,
		@NotNull(message = "checkOutDate is required") LocalDate checkOutDate,
		@Positive(message = "adults must be positive") int adults,
		@PositiveOrZero(message = "children cannot be negative") int children,
		@NotNull(message = "currencyCode is required")
		@Size(min = 3, max = 3, message = "currencyCode must be a 3-letter code") String currencyCode,
		@NotNull(message = "guest is required") @Valid GuestInput guest,
		@NotEmpty(message = "at least one room is required") List<@Valid RoomInput> rooms,
		List<@Valid ExtraInput> extras,
		String promoCode,
		String idempotencyKey,
		String arrivalSlot,
		String specialRequests) {

	/**
	 * Copy carrying the transport-supplied idempotency key.
	 *
	 * <p>Replaces a hand-written 13-argument reconstruction in the controller.
	 * That pattern silently drops any field added to this record and not also
	 * added to the copy — which is exactly how {@code arrivalSlot} and
	 * {@code specialRequests} once reached the API and were discarded.
	 */
	public CreateReservationInput withIdempotencyKey(String key) {
		return new CreateReservationInput(hotelId, checkInDate, checkOutDate, adults, children,
				currencyCode, guest, rooms, extras, promoCode, key, arrivalSlot, specialRequests);
	}
}

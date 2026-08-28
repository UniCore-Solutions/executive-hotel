package com.hotelcollection.hotel.controller;
import com.hotelcollection.hotel.entity.Guest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.dto.reservation.CancelReservationInput;
import com.hotelcollection.hotel.dto.reservation.CreateReservationInput;
import com.hotelcollection.hotel.dto.reservation.CreateResult;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.service.BookingService;

/**
 * Guest reservation endpoints. The {@code Idempotency-Key} header maps to the
 * existing idempotency_key column; a replayed key returns the original
 * reservation with 200 instead of 201.
 */
@RestController
@RequestMapping("/api/v1/reservations")
public class ReservationRestController {

	private final BookingService bookingService;

	public ReservationRestController(BookingService bookingService) {
		this.bookingService = bookingService;
	}

	@PostMapping
	public ResponseEntity<Reservation> create(
			@RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
			@RequestBody CreateReservationInput in) {
		if (idempotencyKey == null || idempotencyKey.isBlank()) {
			throw DomainException.validation("Idempotency-Key header is required");
		}
		CreateResult result = bookingService.create(new CreateReservationInput(in.hotelId(),
				in.checkInDate(), in.checkOutDate(), in.adults(), in.children(), in.currencyCode(),
				in.guest(), in.rooms(), in.extras(), in.promoCode(), idempotencyKey.trim(),
				in.arrivalSlot(), in.specialRequests()));
		return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
				.body(result.reservation());
	}

	@PostMapping("/{reference}/cancel")
	public Reservation cancel(@PathVariable String reference,
			@RequestBody CancelRequest in) {
		return bookingService.cancel(new CancelReservationInput(reference, in.email(),
				in.reasonCode(), in.reasonNote()));
	}

	/** Transport-specific body for the cancel action (reference comes from the path). */
	public record CancelRequest(String email, String reasonCode, String reasonNote) {
	}
}
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

import jakarta.validation.Valid;

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
			@Valid @RequestBody CreateReservationInput in) {
		// The key is a transport concern (a header, not part of the booking
		// document), so it is checked here rather than declared on the record.
		if (idempotencyKey == null || idempotencyKey.isBlank()) {
			throw DomainException.validation("Idempotency-Key header is required");
		}
		CreateResult result = bookingService.create(in.withIdempotencyKey(idempotencyKey.trim()));
		return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
				.body(result.reservation());
	}

	@PostMapping("/{reference}/cancel")
	public Reservation cancel(@PathVariable String reference,
			@RequestBody CancelRequest in) {
		return bookingService.cancel(new CancelReservationInput(reference, in.email(),
				in.reasonCode(), in.reasonNote()));
	}

	/**
	 * Guest self-service lookup, OTP-gated (replaces reference+email alone as
	 * proof — see {@code BookingService}'s "OTP-gated self-service lookup"
	 * section). Always the same generic response, whether or not
	 * {@code reference}+{@code email} actually match anything, so this can
	 * never be used to test which pairs are real.
	 */
	@PostMapping("/{reference}/lookup/otp")
	public ResponseEntity<Void> requestLookupOtp(@PathVariable String reference, @RequestBody LookupOtpRequest in) {
		bookingService.requestReservationLookupOtp(reference, in.email());
		return ResponseEntity.accepted().build();
	}

	@PostMapping("/{reference}/lookup/otp/verify")
	public LookupOtpVerifyResult verifyLookupOtp(@PathVariable String reference,
			@RequestBody LookupOtpVerifyRequest in) {
		java.util.UUID lookupToken = bookingService.verifyReservationLookupOtp(reference, in.email(), in.code());
		return new LookupOtpVerifyResult(lookupToken);
	}

	/** Transport-specific body for the cancel action (reference comes from the path). */
	public record CancelRequest(String email, String reasonCode, String reasonNote) {
	}

	public record LookupOtpRequest(String email) {
	}

	public record LookupOtpVerifyRequest(String email, String code) {
	}

	public record LookupOtpVerifyResult(java.util.UUID lookupToken) {
	}
}
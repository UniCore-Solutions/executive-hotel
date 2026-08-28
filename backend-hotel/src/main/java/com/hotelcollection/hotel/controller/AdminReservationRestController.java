package com.hotelcollection.hotel.controller;

import java.util.UUID;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.service.BookingService;

/**
 * Back-office reservation action endpoint (staff cancellation).
 * Authorization is enforced inside {@link BookingService}.
 */
@RestController
@RequestMapping("/api/v1/admin/reservations")
public class AdminReservationRestController {

	private final BookingService booking;

	public AdminReservationRestController(BookingService booking) {
		this.booking = booking;
	}

	@PostMapping("/{reservationId}/cancel")
	public Reservation cancel(@PathVariable UUID reservationId,
			@RequestBody(required = false) CancelRequest in) {
		String reasonCode = in == null ? null : in.reasonCode();
		String reasonNote = in == null ? null : in.reasonNote();
		return booking.adminCancel(reservationId, reasonCode, reasonNote);
	}

	/** Transport-specific body for the cancel action. */
	public record CancelRequest(String reasonCode, String reasonNote) {
	}
}

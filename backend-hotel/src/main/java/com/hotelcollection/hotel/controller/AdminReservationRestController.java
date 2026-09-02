package com.hotelcollection.hotel.controller;

import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hotelcollection.hotel.entity.CreditNote;
import com.hotelcollection.hotel.entity.Invoice;
import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.service.BookingService;
import com.hotelcollection.hotel.service.InvoiceService;

/**
 * Back-office reservation action endpoints (staff cancellation, invoice and
 * credit-note lookup). Authorization is enforced inside {@link BookingService}
 * / {@link InvoiceService}.
 */
@RestController
@RequestMapping("/api/v1/admin/reservations")
public class AdminReservationRestController {

	private final BookingService booking;
	private final InvoiceService invoiceService;

	public AdminReservationRestController(BookingService booking, InvoiceService invoiceService) {
		this.booking = booking;
		this.invoiceService = invoiceService;
	}

	@PostMapping("/{reservationId}/cancel")
	public Reservation cancel(@PathVariable UUID reservationId,
			@RequestBody(required = false) CancelRequest in) {
		String reasonCode = in == null ? null : in.reasonCode();
		String reasonNote = in == null ? null : in.reasonNote();
		return booking.adminCancel(reservationId, reasonCode, reasonNote);
	}

	@PostMapping("/{reservationId}/rooms/{roomLineId}/assign-room")
	public Reservation assignRoom(@PathVariable UUID reservationId, @PathVariable UUID roomLineId,
			@RequestBody AssignRoomRequest in) {
		return booking.assignRoom(reservationId, roomLineId, in.roomId());
	}

	@PostMapping("/{reservationId}/check-in")
	public Reservation checkIn(@PathVariable UUID reservationId) {
		return booking.checkIn(reservationId);
	}

	@PostMapping("/{reservationId}/check-out")
	public Reservation checkOut(@PathVariable UUID reservationId) {
		return booking.checkOut(reservationId);
	}

	/** Get-or-create, same idempotent semantics as the guest endpoint — used
	 * by both admin consoles' "download invoice" action. */
	@GetMapping("/{reservationId}/invoice")
	public Invoice invoice(@PathVariable UUID reservationId) {
		return invoiceService.getInvoiceForStaff(reservationId);
	}

	/** Read-only — 404s if the reservation was never cancelled, or was
	 * cancelled without ever having an invoice to adjust. */
	@GetMapping("/{reservationId}/credit-note")
	public CreditNote creditNote(@PathVariable UUID reservationId) {
		return invoiceService.getCreditNoteForStaff(reservationId);
	}

	/** Transport-specific body for the cancel action. */
	public record CancelRequest(String reasonCode, String reasonNote) {
	}

	/** Transport-specific body for the assign-room action. */
	public record AssignRoomRequest(UUID roomId) {
	}
}

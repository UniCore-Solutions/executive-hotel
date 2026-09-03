package com.hotelcollection.hotel.dto.email;

/**
 * Template-facing data for {@code email/booking-confirmation}. All values
 * are pre-formatted display strings — the template does no arithmetic or
 * date/money formatting, matching {@code InvoiceDocumentData}'s posture for
 * the PDF pipeline.
 */
public record BookingConfirmationEmailData(
		String firstName,
		String reference,
		String roomTypeName,
		String checkInDisplay,
		String checkOutDisplay,
		String nightsDisplay,
		String guestsDisplay,
		String arrivalSlot,
		String totalDisplay,
		String paymentStatusDisplay,
		boolean paid,
		String manageBookingUrl) {
}

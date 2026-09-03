package com.hotelcollection.hotel.dto.email;

/** Template-facing data for {@code email/invoice} — the covering note only;
 * the invoice document itself is the existing generated PDF, attached
 * separately (never re-rendered here). */
public record InvoiceEmailData(
		String firstName,
		String reference,
		String invoiceNumber,
		String invoiceDateDisplay,
		String totalDisplay,
		String paymentStatusDisplay,
		boolean paid) {
}

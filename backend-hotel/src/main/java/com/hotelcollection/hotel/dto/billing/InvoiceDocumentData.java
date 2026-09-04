package com.hotelcollection.hotel.dto.billing;

import java.util.List;

/**
 * Everything the payment-invoice PDF template needs, already formatted for
 * display. Built once in {@code DocumentGenerationServiceImpl} from the
 * authoritative {@code Invoice}/{@code Hotel} rows — the template never sees
 * the entities themselves, keeping formatting/business logic out of the
 * markup.
 */
public record InvoiceDocumentData(
		String invoiceNumber,
		String logoDataUri,
		String hotelName,
		String hotelAddress,
		String hotelPhone,
		String hotelEmail,
		String billingName,
		String guestEmail,
		String guestPhone,
		String guestCountryCode,
		String issuedAtDisplay,
		String reservationReference,
		String checkInDisplay,
		String checkOutDisplay,
		String nightsDisplay,
		String occupancyDisplay,
		String roomTypeSummary,
		List<LineItem> items,
		String subtotalAmount,
		String discountAmount,
		String taxAmount,
		String feeAmount,
		String totalAmount,
		boolean hasDiscount) {

	public record LineItem(String description, String quantity, String unitPrice, String totalPrice) {
	}
}

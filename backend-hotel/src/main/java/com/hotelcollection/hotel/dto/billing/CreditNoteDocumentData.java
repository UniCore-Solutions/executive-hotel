package com.hotelcollection.hotel.dto.billing;

/**
 * Everything the refund/credit-note PDF template needs, already formatted
 * for display. Built once in {@code DocumentGenerationServiceImpl} from the
 * authoritative {@code CreditNote}/{@code Hotel} rows. Deliberately not
 * itemized the same way as an invoice: a summary of original charge ->
 * penalty retained -> amount credited back, not a re-listing of the
 * original invoice's line items.
 */
public record CreditNoteDocumentData(
		String creditNoteNumber,
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
		String roomTypeSummary,
		String cancelledAtDisplay,
		String cancellationReasonLabel,
		String originalAmount,
		String penaltyAmount,
		String creditedAmount) {
}

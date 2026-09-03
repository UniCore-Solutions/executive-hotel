package com.hotelcollection.hotel.dto.email;

/** Template-facing data for {@code email/refund}. Only reaches the guest
 * once the backend has actually completed the refund — see {@code
 * NotificationService#sendRefundEmail}'s trigger (published only from {@code
 * PaymentServiceImpl#refund} after it applies). */
public record RefundEmailData(
		String firstName,
		String reference,
		String refundAmountDisplay,
		String refundDateDisplay,
		boolean hasCreditNoteAttached) {
}

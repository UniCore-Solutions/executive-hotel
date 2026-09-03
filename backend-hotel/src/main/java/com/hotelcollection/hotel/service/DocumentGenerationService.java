package com.hotelcollection.hotel.service;

import java.util.UUID;

import com.hotelcollection.hotel.entity.CreditNote;
import com.hotelcollection.hotel.entity.Invoice;

/**
 * Renders an {@link Invoice}/{@link CreditNote} into a PDF and stores it.
 * Pure rendering + storage — no business/domain logic (that stays in
 * {@code InvoiceServiceImpl}) and no persistence of the resulting storage
 * key on the entity (the caller does that, inside its own transaction, using
 * the same deterministic key these methods store under).
 */
public interface DocumentGenerationService {

	/** Deterministic, id-derived storage key — never a user-supplied name. */
	static String invoiceStorageKey(UUID invoiceId) {
		return "invoices/" + invoiceId + ".pdf";
	}

	/** Deterministic, id-derived storage key — never a user-supplied name. */
	static String creditNoteStorageKey(UUID creditNoteId) {
		return "credit-notes/" + creditNoteId + ".pdf";
	}

	/** Renders, converts to PDF and stores under {@link #invoiceStorageKey}.
	 * Returns the PDF bytes. */
	byte[] generateInvoicePdf(Invoice invoice);

	/** Renders, converts to PDF and stores under {@link #creditNoteStorageKey}.
	 * Returns the PDF bytes. */
	byte[] generateCreditNotePdf(CreditNote creditNote);
}

package com.hotelcollection.hotel.controller;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hotelcollection.hotel.dto.billing.GeneratedDocument;
import com.hotelcollection.hotel.entity.CreditNote;
import com.hotelcollection.hotel.entity.Invoice;
import com.hotelcollection.hotel.service.InvoiceService;

/** Idempotent invoice/credit-note generation and lookup for a reservation. */
@RestController
@RequestMapping("/api/v1/reservations")
public class InvoiceRestController {

	private final InvoiceService invoiceService;

	public InvoiceRestController(InvoiceService invoiceService) {
		this.invoiceService = invoiceService;
	}

	@PostMapping("/{reference}/invoice")
	public Invoice issue(@PathVariable String reference, @RequestBody IssueRequest in) {
		return invoiceService.getOrCreateInvoice(reference, in.email());
	}

	/** Read-only — credit notes are issued automatically on cancellation, never
	 * on demand; this just fetches the one that already exists (404 if not). */
	@PostMapping("/{reference}/credit-note")
	public CreditNote creditNote(@PathVariable String reference, @RequestBody IssueRequest in) {
		return invoiceService.getCreditNote(reference, in.email());
	}

	/** Reference+email proof is the whole authorization check — enforced
	 * inside {@link InvoiceService}, never by the invoice id alone. */
	@PostMapping("/{reference}/invoice/pdf")
	public ResponseEntity<byte[]> invoicePdf(@PathVariable String reference, @RequestBody IssueRequest in) {
		return pdfResponse(invoiceService.getInvoicePdfForGuest(reference, in.email()));
	}

	@PostMapping("/{reference}/credit-note/pdf")
	public ResponseEntity<byte[]> creditNotePdf(@PathVariable String reference, @RequestBody IssueRequest in) {
		return pdfResponse(invoiceService.getCreditNotePdfForGuest(reference, in.email()));
	}

	private ResponseEntity<byte[]> pdfResponse(GeneratedDocument doc) {
		return ResponseEntity.ok()
				.contentType(MediaType.APPLICATION_PDF)
				.header(HttpHeaders.CONTENT_DISPOSITION,
						ContentDisposition.attachment().filename(doc.filename()).build().toString())
				.body(doc.content());
	}

	/** Transport-specific body (reference comes from the path). */
	public record IssueRequest(String email) {
	}
}
package com.hotelcollection.hotel.controller;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

	/** Transport-specific body (reference comes from the path). */
	public record IssueRequest(String email) {
	}
}
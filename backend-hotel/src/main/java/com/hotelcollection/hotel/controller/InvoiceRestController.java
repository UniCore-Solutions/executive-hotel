package com.hotelcollection.hotel.controller;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hotelcollection.hotel.entity.Invoice;
import com.hotelcollection.hotel.service.InvoiceService;

/** Idempotent invoice generation for a reservation (one invoice per reservation). */
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

	/** Transport-specific body (reference comes from the path). */
	public record IssueRequest(String email) {
	}
}
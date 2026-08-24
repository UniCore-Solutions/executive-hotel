package com.hotelcollection.hotel.controller;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.stereotype.Controller;

import com.hotelcollection.hotel.dto.billing.CapturePaymentInput;
import com.hotelcollection.hotel.dto.billing.CreatePaymentInput;
import com.hotelcollection.hotel.dto.reservation.ReservationLookupInput;
import com.hotelcollection.hotel.entity.Invoice;
import com.hotelcollection.hotel.entity.Payment;
import com.hotelcollection.hotel.service.InvoiceService;
import com.hotelcollection.hotel.service.PaymentService;

/**
 * Billing GraphQL controller: payments (create/capture) and invoice
 * generation. Authorization is enforced inside the service layer.
 */
@Controller
public class BillingGraphQLController {

	private final PaymentService payments;
	private final InvoiceService invoices;

	public BillingGraphQLController(PaymentService payments, InvoiceService invoices) {
		this.payments = payments;
		this.invoices = invoices;
	}

	@MutationMapping
	public Payment createPayment(@Argument CreatePaymentInput input) {
		return payments.createPayment(input);
	}

	@MutationMapping
	public Payment capturePayment(@Argument CapturePaymentInput input) {
		return payments.capture(input);
	}

	/** Generates the reservation invoice on demand (idempotent per reservation). */
	@MutationMapping
	public Invoice issueInvoice(@Argument ReservationLookupInput input) {
		return invoices.getOrCreateInvoice(input.reference(), input.email());
	}
}
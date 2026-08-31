package com.hotelcollection.hotel.controller;

import java.util.UUID;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hotelcollection.hotel.entity.Payment;
import com.hotelcollection.hotel.service.PaymentService;

/**
 * Staff-triggered payment-simulation harness for manual QA — fires the same
 * scenarios (success, decline, duplicate, late, unknown payment, invalid
 * event, already-paid) the automatic settlement simulator can produce, but
 * on demand against a real reservation. Authorization (hotel staff of the
 * payment's reservation) is enforced inside {@link PaymentService}.
 */
@RestController
@RequestMapping("/api/v1/admin/payments")
public class AdminPaymentRestController {

	private final PaymentService paymentService;

	public AdminPaymentRestController(PaymentService paymentService) {
		this.paymentService = paymentService;
	}

	@PostMapping("/{id}/simulate-webhook")
	public Payment simulateWebhook(@PathVariable UUID id, @RequestBody SimulateWebhookRequest in) {
		return paymentService.adminSimulateWebhook(id, in.event(), in.providerReference());
	}

	/** Same as {@link #simulateWebhook}, resolved from a reservation
	 * reference instead of the payment's UUID. */
	@PostMapping("/by-reservation/{reference}/simulate-webhook")
	public Payment simulateWebhookByReservation(@PathVariable String reference,
			@RequestBody SimulateWebhookRequest in) {
		return paymentService.adminSimulateWebhookByReservationReference(reference, in.event(),
				in.providerReference());
	}

	/** {@code event}: {@code "payment.succeeded"} or {@code "payment.failed"}. */
	public record SimulateWebhookRequest(String event, String providerReference) {
	}
}

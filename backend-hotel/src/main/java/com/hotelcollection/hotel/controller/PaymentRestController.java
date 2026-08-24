package com.hotelcollection.hotel.controller;
import java.util.UUID;
import com.hotelcollection.hotel.entity.Guest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hotelcollection.hotel.entity.Payment;
import com.hotelcollection.hotel.dto.billing.CapturePaymentInput;
import com.hotelcollection.hotel.dto.billing.CreatePaymentInput;
import com.hotelcollection.hotel.service.PaymentService;

/** Guest payment endpoints (owner-or-staff access enforced in the payment service). */
@RestController
@RequestMapping("/api/v1/payments")
public class PaymentRestController {

	private final PaymentService paymentService;

	public PaymentRestController(PaymentService paymentService) {
		this.paymentService = paymentService;
	}

	@PostMapping
	public ResponseEntity<Payment> create(@RequestBody CreatePaymentInput in) {
		return ResponseEntity.status(HttpStatus.CREATED).body(paymentService.createPayment(in));
	}

	@PostMapping("/{id}/capture")
	public Payment capture(@PathVariable UUID id,
			@RequestBody(required = false) CaptureRequest in) {
		String gatewayReference = in == null ? null : in.gatewayReference();
		return paymentService.capture(new CapturePaymentInput(id, gatewayReference));
	}

	/** Transport-specific body for the capture action (payment id comes from the path). */
	public record CaptureRequest(String gatewayReference) {
	}
}
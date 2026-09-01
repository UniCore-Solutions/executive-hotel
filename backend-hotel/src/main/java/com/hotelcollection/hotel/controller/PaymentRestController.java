package com.hotelcollection.hotel.controller;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;
import com.hotelcollection.hotel.entity.Guest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hotelcollection.hotel.entity.Payment;
import com.hotelcollection.hotel.dto.billing.CapturePaymentInput;
import com.hotelcollection.hotel.dto.billing.CreatePaymentInput;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.service.PaymentService;

/** Guest payment endpoints (owner-or-staff access enforced in the payment service). */
@RestController
@RequestMapping("/api/v1/payments")
public class PaymentRestController {

	private final PaymentService paymentService;
	private final String webhookSecret;

	public PaymentRestController(PaymentService paymentService,
			@Value("${app.payments.webhook-secret:}") String webhookSecret) {
		this.paymentService = paymentService;
		this.webhookSecret = webhookSecret;
	}

	@PostMapping
	public ResponseEntity<Payment> create(@RequestBody CreatePaymentInput in) {
		return ResponseEntity.status(HttpStatus.CREATED).body(paymentService.createPayment(in));
	}

	/**
	 * Narrower status check than the {@code reservation} GraphQL query (which
	 * already carries the reservation-level {@code paymentStatus} guests
	 * should poll by default) — useful once a reservation has had more than
	 * one payment attempt (e.g. decline then retry) and the caller wants the
	 * outcome of one specific attempt.
	 */
	@GetMapping("/{id}")
	public Payment get(@PathVariable UUID id, @RequestParam(required = false) String guestEmail) {
		return paymentService.getById(id, guestEmail);
	}

	@PostMapping("/{id}/capture")
	public Payment capture(@PathVariable UUID id,
			@RequestBody(required = false) CaptureRequest in) {
		String gatewayReference = in == null ? null : in.gatewayReference();
		String guestEmail = in == null ? null : in.guestEmail();
		return paymentService.capture(new CapturePaymentInput(id, gatewayReference, guestEmail));
	}

	/**
	 * Simulated-provider webhook — mirrors how a real PSP callback would
	 * arrive: no user session, authenticated instead by a shared secret
	 * (never known to the guest-facing client, which is why the frontend can
	 * never mark its own payment successful). The in-process settlement
	 * simulator calls {@link PaymentService#processProviderEvent} directly
	 * (no HTTP hop); this endpoint exists for manual/external simulation —
	 * e.g. a QA script exercising duplicate/late/unknown/invalid scenarios
	 * against a real HTTP boundary. Backend-authoritative: the caller
	 * supplies only the outcome, never the resulting payment/reservation state.
	 */
	@PostMapping("/{id}/webhook")
	public Payment webhook(@PathVariable UUID id,
			@RequestHeader(value = "X-Webhook-Secret", required = false) String secret,
			@RequestBody WebhookRequest in) {
		requireWebhookSecret(secret);
		return paymentService.processProviderEvent(id, in.event(), in.providerReference());
	}

	/**
	 * Same as {@link #webhook}, but for a caller who only has the
	 * human-readable reservation reference (e.g. {@code RC-9JHD3F}) handy
	 * rather than the payment's UUID — resolves to the reservation's pending
	 * payment, or its most recent one if none is pending.
	 */
	@PostMapping("/by-reservation/{reference}/webhook")
	public Payment webhookByReservation(@PathVariable String reference,
			@RequestHeader(value = "X-Webhook-Secret", required = false) String secret,
			@RequestBody WebhookRequest in) {
		requireWebhookSecret(secret);
		return paymentService.processProviderEventByReservationReference(reference, in.event(),
				in.providerReference());
	}

	private void requireWebhookSecret(String secret) {
		// Fails closed: a blank configured secret rejects every call. The
		// comparison is constant-time so a caller cannot recover the secret
		// byte-by-byte from response timing.
		if (webhookSecret.isBlank() || secret == null
				|| !MessageDigest.isEqual(webhookSecret.getBytes(StandardCharsets.UTF_8),
						secret.getBytes(StandardCharsets.UTF_8))) {
			throw DomainException.forbidden("invalid or missing webhook secret");
		}
	}

	/** Transport-specific body for the capture action (payment id comes from the path). */
	public record CaptureRequest(String gatewayReference, String guestEmail) {
	}

	/** {@code event}: {@code "payment.succeeded"} or {@code "payment.failed"}. */
	public record WebhookRequest(String event, String providerReference) {
	}
}
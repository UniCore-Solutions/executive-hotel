package com.hotelcollection.hotel.service.impl;

import java.math.BigDecimal;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.hotelcollection.hotel.entity.EventEnvelope;
import com.hotelcollection.hotel.service.NotificationService;

/**
 * The first {@code @KafkaListener} in this codebase. Reacts to the fact
 * events business services already publish through the transactional
 * outbox — {@code booking.confirmed}, {@code booking.cancelled},
 * {@code payment.refunded}, {@code payment.failed}, {@code user.registered}
 * — and turns each into one or more emails via {@link NotificationService}.
 * No business/domain logic lives here: this class only routes an event type
 * to the notification method(s) it implies. Idempotency, template
 * rendering, provider selection and persistence are all
 * {@code NotificationServiceImpl}'s job.
 *
 * <p>Retry/DLQ: see {@code KafkaConsumerConfig#emailListenerContainerFactory}
 * — a thrown exception (a transport failure) is retried with exponential
 * backoff, then published to {@code <topic>.DLT}; a {@code DomainException}
 * (a deterministic business error — reprocessing would fail the same way)
 * skips straight to the dead-letter topic.
 */
@Component
public class EmailEventConsumer {

	private static final Logger log = LoggerFactory.getLogger(EmailEventConsumer.class);

	private final NotificationService notificationService;

	public EmailEventConsumer(NotificationService notificationService) {
		this.notificationService = notificationService;
	}

	@KafkaListener(
			topics = {
					"hotelcollection.user.registered.v1",
					"hotelcollection.booking.confirmed.v1",
					"hotelcollection.booking.cancelled.v1",
					"hotelcollection.payment.refunded.v1",
					"hotelcollection.payment.failed.v1"
			},
			groupId = "hotel-platform-email-notifications",
			containerFactory = "emailListenerContainerFactory")
	public void onMessage(EventEnvelope envelope) {
		log.debug("email consumer received eventId={} type={} aggregateId={}",
				envelope.eventId(), envelope.eventType(), envelope.aggregateId());
		switch (envelope.eventType()) {
			case "user.registered" -> handleUserRegistered(envelope);
			case "booking.confirmed" -> handleBookingConfirmed(envelope);
			case "booking.cancelled" -> handleBookingCancelled(envelope);
			case "payment.refunded" -> handlePaymentRefunded(envelope);
			case "payment.failed" -> handlePaymentFailed(envelope);
			default -> log.warn("email consumer has no handler for event type {} (eventId={})",
					envelope.eventType(), envelope.eventId());
		}
	}

	private void handleUserRegistered(EventEnvelope envelope) {
		UUID userId = uuid(envelope, "userId");
		notificationService.sendWelcomeEmail(userId, envelope.eventId(), envelope.traceId());
	}

	/** One business fact, two independently-tracked emails (§13). */
	private void handleBookingConfirmed(EventEnvelope envelope) {
		String reference = string(envelope, "reference");
		notificationService.sendBookingConfirmationEmail(reference, envelope.eventId(), envelope.traceId());
		notificationService.sendInvoiceEmail(reference, envelope.eventId(), envelope.traceId());
	}

	private void handleBookingCancelled(EventEnvelope envelope) {
		String reference = string(envelope, "reference");
		notificationService.sendBookingCancellationEmail(reference, envelope.eventId(), envelope.traceId());
	}

	private void handlePaymentRefunded(EventEnvelope envelope) {
		String reference = string(envelope, "reservationReference");
		BigDecimal refundAmount = decimal(envelope, "refundAmount");
		String currencyCode = string(envelope, "currencyCode");
		notificationService.sendRefundEmail(reference, envelope.eventId(), envelope.traceId(), refundAmount,
				currencyCode);
	}

	private void handlePaymentFailed(EventEnvelope envelope) {
		String reference = string(envelope, "reservationReference");
		notificationService.sendPaymentFailedEmail(reference, envelope.eventId(), envelope.traceId());
	}

	// -------------------------------------------------------- payload extraction

	private static String string(EventEnvelope envelope, String key) {
		Object value = envelope.payload().get(key);
		if (value == null) {
			throw new IllegalStateException(
					"event " + envelope.eventType() + " (id=" + envelope.eventId() + ") payload missing " + key);
		}
		return value.toString();
	}

	private static UUID uuid(EventEnvelope envelope, String key) {
		return UUID.fromString(string(envelope, key));
	}

	private static BigDecimal decimal(EventEnvelope envelope, String key) {
		Object value = envelope.payload().get(key);
		if (value == null) {
			throw new IllegalStateException(
					"event " + envelope.eventType() + " (id=" + envelope.eventId() + ") payload missing " + key);
		}
		return new BigDecimal(value.toString());
	}
}

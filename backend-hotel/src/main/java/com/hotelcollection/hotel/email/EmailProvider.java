package com.hotelcollection.hotel.email;

import java.util.List;

/**
 * Outbound email abstraction — the only thing {@link com.hotelcollection.hotel.service.NotificationService}
 * (and therefore every business flow, transitively) depends on. A message
 * here is already rendered (template resolution happens in
 * {@code NotificationServiceImpl}, before this interface is ever reached),
 * so an implementation has no idea what triggered it, what template was
 * used, or what business event it traces back to — it just transports bytes.
 *
 * <p>Swapping providers (Gmail-compatible SMTP today; SendGrid, SES, Mailgun
 * later) means adding a new implementation of this interface plus a new
 * {@link ProviderType} value and registering it with
 * {@link EmailProviderFactory} — nothing above this port changes: not the
 * Kafka consumer, not the templates, not a single business service.
 */
public interface EmailProvider {

	/** One value per {@link EmailProvider} implementation; drives {@link EmailProviderFactory} selection. */
	enum ProviderType {
		SIMULATED, SMTP
	}

	/** A file to attach — content already in memory (invoice/credit-note PDFs
	 * are small, generated on demand; nothing here streams from disk). */
	record EmailAttachment(String filename, byte[] content, String contentType) {}

	/** A rendered, ready-to-send message. {@code htmlBody} is trusted markup
	 * (produced by {@code NotificationServiceImpl}'s Thymeleaf rendering,
	 * which auto-escapes every interpolated value) — providers send it as-is. */
	record EmailMessage(String to, String subject, String htmlBody, List<EmailAttachment> attachments) {

		public EmailMessage(String to, String subject, String htmlBody) {
			this(to, subject, htmlBody, List.of());
		}
	}

	/** {@code providerReference} is set only when {@code success}; {@code error} only when not. */
	record SendResult(boolean success, String providerReference, String error) {}

	SendResult send(EmailMessage message);

	ProviderType type();
}

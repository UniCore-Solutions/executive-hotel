package com.hotelcollection.hotel.email;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import jakarta.mail.internet.MimeMessage;

/**
 * Generic SMTP {@link EmailProvider} — deliberately provider-neutral. Point
 * it at Gmail's SMTP relay ({@code smtp.gmail.com:587} with an app password)
 * today; point the same class at any other SMTP-speaking host (a self-hosted
 * relay, a provider's SMTP endpoint) tomorrow, purely via
 * {@code spring.mail.*} configuration — nothing in this class, or anything
 * that calls {@link EmailProvider}, knows or cares that the destination
 * happens to be Gmail. Selected via {@code app.email.provider=smtp}.
 *
 * <p>{@link JavaMailSender} is autoconfigured by
 * {@code spring-boot-starter-mail} the moment {@code spring.mail.host} is
 * set (it is, with a default) — but constructing the bean opens no
 * connection; only {@link #send} does, and only when this provider is
 * actually selected and invoked.
 */
@Component
public class SmtpEmailProvider implements EmailProvider {

	private static final Logger log = LoggerFactory.getLogger(SmtpEmailProvider.class);

	private final JavaMailSender mailSender;
	private final String fromAddress;

	public SmtpEmailProvider(JavaMailSender mailSender,
			@Value("${app.email.from-address:no-reply@hotel-platform.local}") String fromAddress) {
		this.mailSender = mailSender;
		this.fromAddress = fromAddress;
	}

	@Override
	public SendResult send(EmailMessage message) {
		try {
			MimeMessage mime = mailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(mime, !message.attachments().isEmpty(), "UTF-8");
			helper.setFrom(fromAddress);
			helper.setTo(message.to());
			helper.setSubject(message.subject());
			helper.setText(message.htmlBody(), true);
			for (EmailAttachment attachment : message.attachments()) {
				helper.addAttachment(attachment.filename(),
						new ByteArrayResource(attachment.content()), attachment.contentType());
			}
			mailSender.send(mime);
			return new SendResult(true, "SMTP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(), null);
		} catch (MailException | jakarta.mail.MessagingException ex) {
			log.warn("SMTP send failed to {}", redact(message.to()), ex);
			return new SendResult(false, null, ex.getMessage());
		}
	}

	@Override
	public ProviderType type() {
		return ProviderType.SMTP;
	}

	/** Domain only in logs — never the full address of a real guest/user. */
	private static String redact(String email) {
		int at = email == null ? -1 : email.indexOf('@');
		return at < 0 ? "***" : "***" + email.substring(at);
	}
}

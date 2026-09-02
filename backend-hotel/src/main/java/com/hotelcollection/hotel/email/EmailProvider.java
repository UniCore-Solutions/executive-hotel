package com.hotelcollection.hotel.email;

/**
 * Outbound email abstraction. No real provider is wired yet (see ADR-004,
 * which proposes Resend) — {@link SimulatedEmailProvider} is the only
 * implementation today: it logs the rendered message and always "succeeds",
 * the same posture {@code PaymentServiceImpl}'s mock gateway takes for card
 * capture. Swapping in a real provider (Resend, SMTP, …) is a new
 * implementation of this port only — nothing above it changes.
 */
public interface EmailProvider {

	/** A rendered, ready-to-send message — template resolution happens before this. */
	record EmailMessage(String to, String subject, String body) {}

	/** {@code providerReference} is set only when {@code success}; {@code error} only when not. */
	record SendResult(boolean success, String providerReference, String error) {}

	SendResult send(EmailMessage message);
}

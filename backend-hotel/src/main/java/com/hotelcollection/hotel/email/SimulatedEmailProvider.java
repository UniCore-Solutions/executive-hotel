package com.hotelcollection.hotel.email;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Default {@link EmailProvider}: nothing is actually delivered. The rendered
 * message is logged in full and a synthesized {@code SIM-XXXXXXXX} reference
 * is returned, so the {@code notifications} row this backs still ends up
 * {@code sent} with a real-looking provider reference — exactly the posture
 * {@code PaymentServiceImpl}'s {@code MOCK-XXXXXXXX} capture reference takes
 * for the card gateway. Replace this bean with a real provider (Resend, SMTP)
 * when credentials exist; nothing else in the notification pipeline changes.
 */
@Component
public class SimulatedEmailProvider implements EmailProvider {

	private static final Logger log = LoggerFactory.getLogger(SimulatedEmailProvider.class);

	@Override
	public SendResult send(EmailMessage message) {
		String reference = "SIM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
		log.info("""
				SIMULATED EMAIL (not actually delivered) ref={}
				  to:      {}
				  subject: {}
				  ---
				{}
				  ---""", reference, message.to(), message.subject(), message.body());
		return new SendResult(true, reference, null);
	}
}

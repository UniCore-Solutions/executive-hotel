package com.hotelcollection.hotel.email;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Default {@link EmailProvider}: nothing is actually delivered. The rendered
 * message is logged (attachments named, not dumped) and a synthesized
 * {@code SIM-XXXXXXXX} reference is returned, so the {@code notifications}
 * row this backs still ends up {@code sent} with a real-looking provider
 * reference — the same posture {@code PaymentServiceImpl}'s
 * {@code MOCK-XXXXXXXX} capture reference takes for the card gateway.
 * Selected via {@code app.email.provider=simulated} (the default) — safe to
 * leave active in any environment with no real provider credentials.
 */
@Component
public class SimulatedEmailProvider implements EmailProvider {

	private static final Logger log = LoggerFactory.getLogger(SimulatedEmailProvider.class);

	@Override
	public SendResult send(EmailMessage message) {
		String reference = "SIM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
		log.info("""
				SIMULATED EMAIL (not actually delivered) ref={}
				  to:          {}
				  subject:     {}
				  attachments: {}
				  ---
				{}
				  ---""", reference, message.to(), message.subject(),
				message.attachments().stream().map(EmailAttachment::filename).toList(),
				message.htmlBody());
		return new SendResult(true, reference, null);
	}

	@Override
	public ProviderType type() {
		return ProviderType.SIMULATED;
	}
}

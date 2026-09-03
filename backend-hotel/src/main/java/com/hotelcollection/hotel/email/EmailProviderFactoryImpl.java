package com.hotelcollection.hotel.email;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Strategy/factory: holds every {@link EmailProvider} bean Spring finds
 * (one per {@link EmailProvider.ProviderType}) and resolves the one named by
 * {@code app.email.provider} at construction time — a typo or a provider
 * with no matching bean fails application startup, the same fail-fast
 * posture {@code JwtService} takes for a missing secret, rather than
 * discovering the misconfiguration on the first booking confirmation.
 */
@Component
public class EmailProviderFactoryImpl implements EmailProviderFactory {

	private final Map<EmailProvider.ProviderType, EmailProvider> providersByType;
	private final EmailProvider.ProviderType configured;

	public EmailProviderFactoryImpl(List<EmailProvider> providers,
			@Value("${app.email.provider:simulated}") String configuredProvider) {
		this.providersByType = providers.stream()
				.collect(Collectors.toMap(EmailProvider::type, Function.identity()));
		this.configured = parse(configuredProvider);
		if (!providersByType.containsKey(configured)) {
			throw new IllegalStateException("app.email.provider=" + configuredProvider
					+ " but no EmailProvider bean of type " + configured + " is registered");
		}
	}

	@Override
	public EmailProvider resolve() {
		return providersByType.get(configured);
	}

	private static EmailProvider.ProviderType parse(String raw) {
		try {
			return EmailProvider.ProviderType.valueOf(raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT));
		} catch (IllegalArgumentException ex) {
			throw new IllegalStateException("unknown app.email.provider value: " + raw, ex);
		}
	}
}

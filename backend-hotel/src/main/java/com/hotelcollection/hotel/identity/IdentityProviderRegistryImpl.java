package com.hotelcollection.hotel.identity;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.hotelcollection.hotel.exception.DomainException;

/**
 * Holds every {@link ExternalIdentityProvider} bean Spring finds. A provider
 * with no configured credentials (e.g. blank {@code GOOGLE_CLIENT_ID}) never
 * registers a bean in the first place (see {@link GoogleIdentityProvider}'s
 * {@code @ConditionalOnProperty}), so it is simply absent here — no other
 * code needs to branch on "is this provider enabled?".
 */
@Component
public class IdentityProviderRegistryImpl implements IdentityProviderRegistry {

	private final Map<IdentityProviderType, ExternalIdentityProvider> byType;

	public IdentityProviderRegistryImpl(List<ExternalIdentityProvider> providers) {
		this.byType = providers.stream()
				.collect(Collectors.toMap(ExternalIdentityProvider::type, Function.identity()));
	}

	@Override
	public ExternalIdentityProvider resolve(String providerName) {
		IdentityProviderType type;
		try {
			type = IdentityProviderType.valueOf(
					providerName == null ? "" : providerName.trim().toUpperCase(Locale.ROOT));
		} catch (IllegalArgumentException ex) {
			throw DomainException.notFound("unknown identity provider");
		}
		ExternalIdentityProvider provider = byType.get(type);
		if (provider == null) {
			throw DomainException.notFound("unknown identity provider");
		}
		return provider;
	}
}

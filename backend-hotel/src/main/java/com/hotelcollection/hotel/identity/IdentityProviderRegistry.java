package com.hotelcollection.hotel.identity;

/**
 * Resolves an {@link ExternalIdentityProvider} by name. The single seam
 * {@code ExternalAuthService} uses to reach a provider — adding a new one
 * never touches this interface or its callers.
 */
public interface IdentityProviderRegistry {

	/**
	 * @throws com.hotelcollection.hotel.exception.DomainException (notFound) if
	 *         {@code providerName} names no provider, or names one that is not
	 *         currently configured (e.g. no client id set) — the two cases are
	 *         deliberately indistinguishable to the caller.
	 */
	ExternalIdentityProvider resolve(String providerName);
}

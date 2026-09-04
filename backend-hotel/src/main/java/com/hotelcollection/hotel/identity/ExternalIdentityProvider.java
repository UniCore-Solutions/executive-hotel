package com.hotelcollection.hotel.identity;

/**
 * Port to one external identity/SSO provider. The application/service layer
 * depends only on this interface and on {@link IdentityProviderRegistry} —
 * nothing above this package knows Google (or any other provider) exists.
 */
public interface ExternalIdentityProvider {

	IdentityProviderType type();

	/**
	 * Builds the URL to redirect the browser to for user consent. The
	 * provider's own registered redirect URI is the implementation's concern
	 * (configured alongside its client id/secret) — never passed in here, since
	 * it must byte-for-byte match what was sent in the authorization request.
	 */
	String buildAuthorizationUrl(String state, String nonce);

	/**
	 * Exchanges an authorization code for a validated identity. Implementations
	 * must fully verify any identity token before returning (signature, issuer,
	 * audience, expiry, subject) — this method's return value is trusted as-is
	 * by every caller.
	 *
	 * @throws com.hotelcollection.hotel.exception.DomainException (unavailable)
	 *         if the exchange or validation fails for any reason
	 */
	ExternalUserInfo exchangeCode(String code, String expectedNonce);
}

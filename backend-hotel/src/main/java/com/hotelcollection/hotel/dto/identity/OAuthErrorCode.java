package com.hotelcollection.hotel.dto.identity;

/**
 * The closed set of failure codes surfaced to the browser after a failed
 * OAuth callback (as {@code ?oauthError=<name, lowercased>} on the redirect
 * back to the guest site) — deliberately coarse: the specific cause is
 * logged server-side, never distinguished to an anonymous caller.
 */
public enum OAuthErrorCode {
	/** The user cancelled or denied consent at the provider. */
	ACCESS_DENIED,
	/** state missing, unknown, expired, or already consumed — one code for all four. */
	STATE_INVALID,
	/** Code exchange or identity-token validation failed, or the provider is unknown/disabled. */
	PROVIDER_ERROR,
	/** The resolved local account cannot be signed into this way (locked/inactive, or an
	 *  active account whose provider email was not verified). */
	ACCOUNT_CONFLICT
}

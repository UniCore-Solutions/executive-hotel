package com.hotelcollection.hotel.dto.identity;

/** Outcome of {@code ExternalAuthService#handleCallback} — never an exception,
 * since the controller's response is a browser redirect either way. */
public record OAuthCallbackResult(boolean success, String grant, String redirectPath, OAuthErrorCode error) {

	public static OAuthCallbackResult success(String grant, String redirectPath) {
		return new OAuthCallbackResult(true, grant, redirectPath, null);
	}

	public static OAuthCallbackResult failure(OAuthErrorCode error) {
		return new OAuthCallbackResult(false, null, null, error);
	}
}

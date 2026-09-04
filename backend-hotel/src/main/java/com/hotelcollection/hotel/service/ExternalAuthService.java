package com.hotelcollection.hotel.service;

import com.hotelcollection.hotel.dto.identity.AuthPayload;
import com.hotelcollection.hotel.dto.identity.OAuthCallbackResult;

/**
 * Application-layer orchestration for signing in via an external identity
 * provider (Google today; see {@code identity/} for the provider
 * abstraction and the account-linking policy in {@code docs/AUTHENTICATION.md}).
 * Provider-agnostic — nothing here knows Google exists.
 */
public interface ExternalAuthService {

	/** @return the URL to redirect the browser to for user consent. */
	String startAuthorization(String providerName, String redirectPath);

	/**
	 * Redeems the provider's callback (a code+state pair, or an error such as
	 * user cancellation). Never throws — every failure is classified into the
	 * result itself, since the controller's response here is a browser
	 * redirect, not a JSON error body.
	 */
	OAuthCallbackResult handleCallback(String providerName, String code, String state, String providerError);

	/** Redeems a one-time post-callback login grant exactly once for a real session. */
	AuthPayload completeSession(String grant);
}

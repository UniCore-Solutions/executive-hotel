package com.hotelcollection.hotel.controller;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hotelcollection.hotel.dto.identity.AuthPayload;
import com.hotelcollection.hotel.dto.identity.OAuthCallbackResult;
import com.hotelcollection.hotel.dto.identity.OAuthSessionInput;
import com.hotelcollection.hotel.service.ExternalAuthService;
import com.hotelcollection.hotel.util.SafeRedirect;

/**
 * Google/future-provider SSO. Deliberately mapped at {@code /api/auth}, not
 * {@code /api/v1/auth} like {@link AuthRestController} — a provider's
 * redirect_uri is registered out-of-band in that provider's own console and
 * must be a fixed, versionless URL for as long as that registration exists;
 * it cannot follow this API's own versioning convention. See
 * docs/AUTHENTICATION.md.
 */
@RestController
@RequestMapping("/api/auth")
public class ExternalAuthRestController {

	private final ExternalAuthService externalAuthService;
	private final String frontendBaseUrl;

	public ExternalAuthRestController(ExternalAuthService externalAuthService,
			@Value("${app.frontend-base-url:http://localhost:3000}") String frontendBaseUrl) {
		this.externalAuthService = externalAuthService;
		this.frontendBaseUrl = frontendBaseUrl;
	}

	/** Starts an external-identity sign-in — redirects the browser to the
	 * provider's consent screen. Unknown/disabled provider -&gt; plain 404
	 * (no round trip to the provider has started yet, so a JSON error is fine
	 * here, unlike the callback below). */
	@GetMapping("/{provider}")
	public ResponseEntity<Void> startExternalAuth(@PathVariable String provider,
			@RequestParam(required = false) String redirect) {
		String authorizationUrl = externalAuthService.startAuthorization(provider, SafeRedirect.validate(redirect));
		return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(authorizationUrl)).build();
	}

	/** Provider callback. Always a redirect back to the guest site — success
	 * carries a one-time login grant, failure carries one of the closed
	 * {@code OAuthErrorCode} values, never a raw exception message. */
	@GetMapping("/{provider}/callback")
	public ResponseEntity<Void> externalAuthCallback(@PathVariable String provider,
			@RequestParam(required = false) String code, @RequestParam(required = false) String state,
			@RequestParam(required = false) String error) {
		OAuthCallbackResult result = externalAuthService.handleCallback(provider, code, state, error);
		String location = result.success()
				? frontendBaseUrl + "/account/oauth-callback?grant=" + encode(result.grant())
						+ (result.redirectPath() != null ? "&redirect=" + encode(result.redirectPath()) : "")
				: frontendBaseUrl + "/account?oauthError="
						+ result.error().name().toLowerCase(Locale.ROOT);
		return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(location)).build();
	}

	/** Redeems a one-time login grant (minted by the callback above) for a
	 * real session — the same {@link AuthPayload} shape {@code /api/v1/auth/login}
	 * and {@code /register/verify} return. Called by the frontend's BFF, never
	 * the browser directly. */
	@PostMapping("/oauth/session")
	public AuthPayload completeOAuthSession(@RequestBody OAuthSessionInput in) {
		return externalAuthService.completeSession(in.grant());
	}

	private static String encode(String value) {
		return URLEncoder.encode(value, StandardCharsets.UTF_8);
	}
}

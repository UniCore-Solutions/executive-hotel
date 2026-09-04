package com.hotelcollection.hotel.identity;

import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.hotelcollection.hotel.exception.DomainException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jwt.JWT;
import com.nimbusds.oauth2.sdk.AuthorizationCode;
import com.nimbusds.oauth2.sdk.AuthorizationCodeGrant;
import com.nimbusds.oauth2.sdk.ResponseType;
import com.nimbusds.oauth2.sdk.Scope;
import com.nimbusds.oauth2.sdk.TokenRequest;
import com.nimbusds.oauth2.sdk.TokenResponse;
import com.nimbusds.oauth2.sdk.auth.ClientSecretBasic;
import com.nimbusds.oauth2.sdk.auth.Secret;
import com.nimbusds.oauth2.sdk.http.HTTPResponse;
import com.nimbusds.oauth2.sdk.id.ClientID;
import com.nimbusds.oauth2.sdk.id.Issuer;
import com.nimbusds.oauth2.sdk.id.State;
import com.nimbusds.openid.connect.sdk.AuthenticationRequest;
import com.nimbusds.openid.connect.sdk.Nonce;
import com.nimbusds.openid.connect.sdk.OIDCTokenResponse;
import com.nimbusds.openid.connect.sdk.OIDCTokenResponseParser;
import com.nimbusds.openid.connect.sdk.claims.IDTokenClaimsSet;
import com.nimbusds.openid.connect.sdk.token.OIDCTokens;
import com.nimbusds.openid.connect.sdk.validators.IDTokenValidator;

/**
 * The only Google-specific class in this backend. Builds the consent-screen
 * URL, exchanges an authorization code for tokens, and validates the
 * returned ID token's signature/issuer/audience/expiry/nonce via Nimbus's
 * OIDC SDK (Google's own recommended approach for server-side Java — not
 * hand-rolled crypto). Never stores or returns an access/refresh token.
 *
 * <p>Absent entirely from {@link IdentityProviderRegistry} when
 * {@code app.oauth.google.client-id} is blank ({@code @ConditionalOnProperty}
 * below) — that is the whole "Google sign-in disabled" switch.
 */
@Component
@ConditionalOnProperty(prefix = "app.oauth.google", name = "client-id")
public class GoogleIdentityProvider implements ExternalIdentityProvider {

	private static final Logger log = LoggerFactory.getLogger(GoogleIdentityProvider.class);

	private static final URI AUTHORIZATION_ENDPOINT = URI.create("https://accounts.google.com/o/oauth2/v2/auth");
	private static final URI TOKEN_ENDPOINT = URI.create("https://oauth2.googleapis.com/token");
	private static final Issuer ISSUER = new Issuer("https://accounts.google.com");
	private static final String JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

	private final ClientID clientId;
	private final Secret clientSecret;
	private final URI redirectUri;
	private final IDTokenValidator idTokenValidator;

	@Autowired
	public GoogleIdentityProvider(
			@Value("${app.oauth.google.client-id}") String clientId,
			@Value("${app.oauth.google.client-secret}") String clientSecret,
			@Value("${app.oauth.google.redirect-uri}") String redirectUri) {
		this(new ClientID(clientId), new Secret(clientSecret), URI.create(redirectUri),
				buildValidator(new ClientID(clientId)));
	}

	/** Test-only seam: lets a unit test substitute a validator built from a
	 * local/in-memory JWK source instead of Google's real endpoint. */
	GoogleIdentityProvider(ClientID clientId, Secret clientSecret, URI redirectUri,
			IDTokenValidator idTokenValidator) {
		this.clientId = clientId;
		this.clientSecret = clientSecret;
		this.redirectUri = redirectUri;
		this.idTokenValidator = idTokenValidator;
	}

	private static IDTokenValidator buildValidator(ClientID clientId) {
		try {
			// Fetches + caches Google's published JWK set internally; no manual
			// JWKS handling needed here.
			return new IDTokenValidator(ISSUER, clientId, JWSAlgorithm.RS256, new URL(JWKS_URL));
		} catch (MalformedURLException ex) {
			throw new IllegalStateException("invalid Google JWKS URL", ex);
		}
	}

	@Override
	public IdentityProviderType type() {
		return IdentityProviderType.GOOGLE;
	}

	@Override
	public String buildAuthorizationUrl(String state, String nonce) {
		AuthenticationRequest request = new AuthenticationRequest.Builder(
				ResponseType.CODE, new Scope("openid", "email", "profile"), clientId, redirectUri)
				.endpointURI(AUTHORIZATION_ENDPOINT)
				.state(new State(state))
				.nonce(new Nonce(nonce))
				.build();
		return request.toURI().toString();
	}

	@Override
	public ExternalUserInfo exchangeCode(String code, String expectedNonce) {
		OIDCTokens tokens = exchangeForTokens(code);
		IDTokenClaimsSet claims = validateIdToken(tokens.getIDToken(), expectedNonce);
		String email = claims.getStringClaim("email");
		if (email == null || email.isBlank()) {
			throw DomainException.unavailable("google identity token carried no email claim");
		}
		Boolean emailVerified = claims.getBooleanClaim("email_verified");
		String name = claims.getStringClaim("name");
		return new ExternalUserInfo(claims.getSubject().getValue(), email, Boolean.TRUE.equals(emailVerified), name);
	}

	private OIDCTokens exchangeForTokens(String code) {
		try {
			TokenRequest request = new TokenRequest(TOKEN_ENDPOINT, new ClientSecretBasic(clientId, clientSecret),
					new AuthorizationCodeGrant(new AuthorizationCode(code), redirectUri));
			HTTPResponse httpResponse = request.toHTTPRequest().send();
			TokenResponse tokenResponse = OIDCTokenResponseParser.parse(httpResponse);
			if (!tokenResponse.indicatesSuccess()) {
				// Never log the code/secret/response body — only the HTTP status
				// and Google's own (non-secret) error code, e.g. "invalid_grant".
				String errorCode = tokenResponse.toErrorResponse().getErrorObject() == null ? "unknown"
						: String.valueOf(tokenResponse.toErrorResponse().getErrorObject().getCode());
				log.warn("google token exchange rejected: httpStatus={} error={}", httpResponse.getStatusCode(),
						errorCode);
				throw DomainException.unavailable("google token exchange failed");
			}
			return ((OIDCTokenResponse) tokenResponse.toSuccessResponse()).getOIDCTokens();
		} catch (DomainException ex) {
			throw ex;
		} catch (Exception ex) {
			// Never log the code/secret — only the failure's type/message.
			log.warn("google token exchange failed: {}", ex.toString());
			throw DomainException.unavailable("google token exchange failed");
		}
	}

	/** Package-private (not private) so {@code GoogleIdentityProviderTest} can
	 * exercise ID-token validation directly, without also stubbing the
	 * network call {@link #exchangeForTokens} makes. */
	IDTokenClaimsSet validateIdToken(JWT idToken, String expectedNonce) {
		try {
			return idTokenValidator.validate(idToken, expectedNonce == null ? null : new Nonce(expectedNonce));
		} catch (Exception ex) {
			// Never log the raw token — only the validation failure's type/message
			// (e.g. "Unexpected JWT issuer", "Signed JWT rejected: signature
			// verification failed"), which Nimbus's exceptions already keep free
			// of the token's own contents.
			log.warn("google identity token failed validation: {}", ex.toString());
			throw DomainException.unavailable("google identity token failed validation");
		}
	}
}

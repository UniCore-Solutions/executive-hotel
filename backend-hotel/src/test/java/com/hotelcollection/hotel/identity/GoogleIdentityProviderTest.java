package com.hotelcollection.hotel.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.Date;

import org.junit.jupiter.api.Test;

import com.hotelcollection.hotel.exception.DomainException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.nimbusds.oauth2.sdk.auth.Secret;
import com.nimbusds.oauth2.sdk.id.ClientID;
import com.nimbusds.oauth2.sdk.id.Issuer;
import com.nimbusds.openid.connect.sdk.claims.IDTokenClaimsSet;
import com.nimbusds.openid.connect.sdk.validators.IDTokenValidator;

/**
 * ID-token validation edge cases (signature/issuer/audience/expiry/nonce), a
 * locally generated RSA keypair standing in for Google's real signing key —
 * no real network call, via the package-private test seam
 * {@link GoogleIdentityProvider#validateIdToken} and constructor.
 */
class GoogleIdentityProviderTest {

	private static final String ISSUER = "https://accounts.google.com";
	private static final String CLIENT_ID = "test-client-id";
	private static final String NONCE = "nonce-value";

	@Test
	void validTokenYieldsIdentity() throws Exception {
		RSAKey signingKey = generateKey();
		GoogleIdentityProvider provider = providerFor(signingKey);
		var idToken = signedToken(signingKey, claims(ISSUER, CLIENT_ID, "google-sub-1", "guest@example.com",
				true, NONCE, Instant.now().plusSeconds(300)));

		IDTokenClaimsSet claims = provider.validateIdToken(idToken, NONCE);

		assertThat(claims.getSubject().getValue()).isEqualTo("google-sub-1");
		assertThat(claims.getStringClaim("email")).isEqualTo("guest@example.com");
		assertThat(claims.getBooleanClaim("email_verified")).isTrue();
	}

	@Test
	void wrongSignatureIsRejected() throws Exception {
		RSAKey trustedKey = generateKey();
		RSAKey attackerKey = generateKey();
		GoogleIdentityProvider provider = providerFor(trustedKey);
		var idToken = signedToken(attackerKey, claims(ISSUER, CLIENT_ID, "google-sub-1", "guest@example.com",
				true, NONCE, Instant.now().plusSeconds(300)));

		assertThatThrownBy(() -> provider.validateIdToken(idToken, NONCE))
				.isInstanceOf(DomainException.class);
	}

	@Test
	void wrongIssuerIsRejected() throws Exception {
		RSAKey signingKey = generateKey();
		GoogleIdentityProvider provider = providerFor(signingKey);
		var idToken = signedToken(signingKey, claims("https://evil.example.com", CLIENT_ID, "google-sub-1",
				"guest@example.com", true, NONCE, Instant.now().plusSeconds(300)));

		assertThatThrownBy(() -> provider.validateIdToken(idToken, NONCE))
				.isInstanceOf(DomainException.class);
	}

	@Test
	void wrongAudienceIsRejected() throws Exception {
		RSAKey signingKey = generateKey();
		GoogleIdentityProvider provider = providerFor(signingKey);
		var idToken = signedToken(signingKey, claims(ISSUER, "some-other-client-id", "google-sub-1",
				"guest@example.com", true, NONCE, Instant.now().plusSeconds(300)));

		assertThatThrownBy(() -> provider.validateIdToken(idToken, NONCE))
				.isInstanceOf(DomainException.class);
	}

	@Test
	void expiredTokenIsRejected() throws Exception {
		RSAKey signingKey = generateKey();
		GoogleIdentityProvider provider = providerFor(signingKey);
		var idToken = signedToken(signingKey, claims(ISSUER, CLIENT_ID, "google-sub-1", "guest@example.com",
				true, NONCE, Instant.now().minusSeconds(60)));

		assertThatThrownBy(() -> provider.validateIdToken(idToken, NONCE))
				.isInstanceOf(DomainException.class);
	}

	@Test
	void mismatchedNonceIsRejected() throws Exception {
		RSAKey signingKey = generateKey();
		GoogleIdentityProvider provider = providerFor(signingKey);
		var idToken = signedToken(signingKey, claims(ISSUER, CLIENT_ID, "google-sub-1", "guest@example.com",
				true, NONCE, Instant.now().plusSeconds(300)));

		assertThatThrownBy(() -> provider.validateIdToken(idToken, "a-different-nonce"))
				.isInstanceOf(DomainException.class);
	}

	private static GoogleIdentityProvider providerFor(RSAKey signingKey) throws Exception {
		IDTokenValidator validator = new IDTokenValidator(new Issuer(ISSUER), new ClientID(CLIENT_ID),
				JWSAlgorithm.RS256, new JWKSet(signingKey.toPublicJWK()));
		return new GoogleIdentityProvider(new ClientID(CLIENT_ID), new Secret("test-secret"),
				java.net.URI.create("http://localhost:8180/api/v1/auth/google/callback"), validator);
	}

	private static RSAKey generateKey() throws Exception {
		return new RSAKeyGenerator(2048).keyID("test-key").generate();
	}

	private static JWTClaimsSet claims(String issuer, String audience, String subject, String email,
			boolean emailVerified, String nonce, Instant expiry) {
		return new JWTClaimsSet.Builder()
				.issuer(issuer)
				.audience(audience)
				.subject(subject)
				.claim("email", email)
				.claim("email_verified", emailVerified)
				.claim("name", "Test Guest")
				.claim("nonce", nonce)
				.issueTime(Date.from(Instant.now()))
				.expirationTime(Date.from(expiry))
				.build();
	}

	private static SignedJWT signedToken(RSAKey signingKey, JWTClaimsSet claims) throws Exception {
		SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(signingKey.getKeyID()).build(),
				claims);
		jwt.sign(new RSASSASigner(signingKey));
		return jwt;
	}
}

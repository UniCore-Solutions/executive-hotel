package com.hotelcollection.hotel.service.impl;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.dto.identity.AuthPayload;
import com.hotelcollection.hotel.dto.identity.OAuthCallbackResult;
import com.hotelcollection.hotel.dto.identity.OAuthErrorCode;
import com.hotelcollection.hotel.entity.LoginGrant;
import com.hotelcollection.hotel.entity.OAuthState;
import com.hotelcollection.hotel.entity.User;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.identity.ExternalIdentityProvider;
import com.hotelcollection.hotel.identity.ExternalUserInfo;
import com.hotelcollection.hotel.identity.IdentityProviderRegistry;
import com.hotelcollection.hotel.repository.LoginGrantRepository;
import com.hotelcollection.hotel.repository.OAuthStateRepository;
import com.hotelcollection.hotel.repository.UserRepository;
import com.hotelcollection.hotel.service.ExternalAuthService;

/**
 * Orchestrates external-identity sign-in end to end: builds the provider's
 * authorization URL, redeems its callback (validating the CSRF/replay
 * {@code state} before ever touching the network), delegates the
 * account-linking decision to {@link ExternalIdentityLinker}, and mints the
 * one-time {@link LoginGrant} the frontend's BFF exchanges for a real
 * session. Provider-agnostic: reaches Google (or any future provider) only
 * through {@link IdentityProviderRegistry}.
 */
@Service
public class ExternalAuthServiceImpl implements ExternalAuthService {

	private static final Logger log = LoggerFactory.getLogger(ExternalAuthServiceImpl.class);
	private static final SecureRandom RANDOM = new SecureRandom();

	private final UserRepository userRepository;
	private final OAuthStateRepository oauthStateRepository;
	private final LoginGrantRepository loginGrantRepository;
	private final IdentityProviderRegistry providerRegistry;
	private final ExternalIdentityLinker identityLinker;
	private final AuthTokenIssuer tokenIssuer;
	private final long stateTtlMinutes;
	private final long grantTtlMinutes;

	public ExternalAuthServiceImpl(UserRepository userRepository, OAuthStateRepository oauthStateRepository,
			LoginGrantRepository loginGrantRepository, IdentityProviderRegistry providerRegistry,
			ExternalIdentityLinker identityLinker, AuthTokenIssuer tokenIssuer,
			@Value("${app.oauth.state-ttl-minutes:10}") long stateTtlMinutes,
			@Value("${app.oauth.grant-ttl-minutes:2}") long grantTtlMinutes) {
		this.userRepository = userRepository;
		this.oauthStateRepository = oauthStateRepository;
		this.loginGrantRepository = loginGrantRepository;
		this.providerRegistry = providerRegistry;
		this.identityLinker = identityLinker;
		this.tokenIssuer = tokenIssuer;
		this.stateTtlMinutes = stateTtlMinutes;
		this.grantTtlMinutes = grantTtlMinutes;
	}

	@Override
	@Transactional
	public String startAuthorization(String providerName, String redirectPath) {
		ExternalIdentityProvider provider = providerRegistry.resolve(providerName);

		OAuthState row = new OAuthState();
		row.setState(randomToken());
		row.setProvider(provider.type());
		row.setNonce(randomToken());
		row.setRedirectPath(redirectPath);
		row.setCreatedAt(Instant.now());
		row.setExpiresAt(Instant.now().plusSeconds(stateTtlMinutes * 60));
		oauthStateRepository.save(row);

		return provider.buildAuthorizationUrl(row.getState(), row.getNonce());
	}

	@Override
	@Transactional
	public OAuthCallbackResult handleCallback(String providerName, String code, String state, String providerError) {
		if (providerError != null && !providerError.isBlank()) {
			// The user cancelled/denied consent — never surface the provider's
			// own error string to the browser, but it's normal/expected, so
			// this is informational, not a warning.
			log.info("oauth consent denied: provider={} providerError={}", providerName, providerError);
			return OAuthCallbackResult.failure(OAuthErrorCode.ACCESS_DENIED);
		}

		ExternalIdentityProvider provider;
		try {
			provider = providerRegistry.resolve(providerName);
		} catch (DomainException ex) {
			log.warn("oauth callback for unknown/disabled provider: {}", providerName);
			return OAuthCallbackResult.failure(OAuthErrorCode.PROVIDER_ERROR);
		}

		OAuthState stateRow = state == null ? null : oauthStateRepository.findByState(state).orElse(null);
		if (stateRow == null || stateRow.getConsumedAt() != null || stateRow.getExpiresAt().isBefore(Instant.now())) {
			// Missing, unknown, expired, or replayed — one generic code for all
			// four to the browser; logged distinctly server-side for diagnosis.
			log.warn("oauth callback rejected: provider={} state={}", providerName,
					stateRow == null ? "not_found"
							: stateRow.getConsumedAt() != null ? "already_consumed" : "expired");
			return OAuthCallbackResult.failure(OAuthErrorCode.STATE_INVALID);
		}
		// Single-use, marked before any network call — closes the replay
		// window regardless of what happens next.
		stateRow.setConsumedAt(Instant.now());
		oauthStateRepository.save(stateRow);

		ExternalUserInfo info;
		try {
			info = provider.exchangeCode(code, stateRow.getNonce());
		} catch (DomainException ex) {
			return OAuthCallbackResult.failure(OAuthErrorCode.PROVIDER_ERROR);
		}

		User user;
		try {
			user = identityLinker.findOrLinkOrCreate(provider.type(), info);
		} catch (DomainException ex) {
			// Never log the email itself — it's the target's own address, not
			// something under attacker control, but this log is at WARN and
			// could be widely retained; the failure reason alone is enough to
			// diagnose a linking-policy problem.
			log.warn("oauth account-linking rejected: provider={} reason={}", providerName, ex.getMessage());
			return OAuthCallbackResult.failure(OAuthErrorCode.ACCOUNT_CONFLICT);
		}

		LoginGrant grant = new LoginGrant();
		grant.setGrantValue(randomToken());
		grant.setUserId(user.getId());
		grant.setRedirectPath(stateRow.getRedirectPath());
		grant.setCreatedAt(Instant.now());
		grant.setExpiresAt(Instant.now().plusSeconds(grantTtlMinutes * 60));
		loginGrantRepository.save(grant);

		return OAuthCallbackResult.success(grant.getGrantValue(), stateRow.getRedirectPath());
	}

	@Override
	@Transactional
	public AuthPayload completeSession(String grant) {
		LoginGrant row = loginGrantRepository.findByGrantValue(grant == null ? "" : grant)
				.orElseThrow(() -> DomainException.notFound("invalid or expired sign-in link"));
		if (row.getConsumedAt() != null) {
			throw DomainException.conflict("this sign-in link was already used");
		}
		if (row.getExpiresAt().isBefore(Instant.now())) {
			throw DomainException.notFound("invalid or expired sign-in link");
		}
		row.setConsumedAt(Instant.now());
		loginGrantRepository.save(row);

		User user = userRepository.findByIdWithRoles(row.getUserId())
				.orElseThrow(() -> DomainException.notFound("user not found"));
		return new AuthPayload(tokenIssuer.issueToken(user), tokenIssuer.currentUserOf(user));
	}

	private static String randomToken() {
		byte[] bytes = new byte[32];
		RANDOM.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}
}

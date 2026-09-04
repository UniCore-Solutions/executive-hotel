package com.hotelcollection.hotel.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;

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
import com.hotelcollection.hotel.identity.IdentityProviderType;
import com.hotelcollection.hotel.repository.LoginGrantRepository;
import com.hotelcollection.hotel.repository.OAuthStateRepository;
import com.hotelcollection.hotel.repository.UserRepository;
import com.hotelcollection.hotel.security.CurrentUser;

class ExternalAuthServiceImplTest {

	private final UserRepository userRepository = mock(UserRepository.class);
	private final OAuthStateRepository oauthStateRepository = mock(OAuthStateRepository.class);
	private final LoginGrantRepository loginGrantRepository = mock(LoginGrantRepository.class);
	private final IdentityProviderRegistry providerRegistry = mock(IdentityProviderRegistry.class);
	private final ExternalIdentityLinker identityLinker = mock(ExternalIdentityLinker.class);
	private final AuthTokenIssuer tokenIssuer = mock(AuthTokenIssuer.class);

	private final ExternalAuthServiceImpl service = new ExternalAuthServiceImpl(userRepository, oauthStateRepository,
			loginGrantRepository, providerRegistry, identityLinker, tokenIssuer, 10, 2);

	private final ExternalIdentityProvider google = mock(ExternalIdentityProvider.class);

	@Test
	void startAuthorizationPersistsStateAndReturnsAuthorizationUrl() {
		when(providerRegistry.resolve("google")).thenReturn(google);
		when(google.type()).thenReturn(IdentityProviderType.GOOGLE);
		when(google.buildAuthorizationUrl(any(), any())).thenReturn("https://accounts.google.com/authorize?x=1");

		String url = service.startAuthorization("google", "/account");

		assertThat(url).isEqualTo("https://accounts.google.com/authorize?x=1");
		verify(oauthStateRepository).save(any(OAuthState.class));
	}

	@Test
	void callbackWithProviderErrorIsAccessDenied() {
		OAuthCallbackResult result = service.handleCallback("google", null, null, "access_denied");

		assertThat(result.success()).isFalse();
		assertThat(result.error()).isEqualTo(OAuthErrorCode.ACCESS_DENIED);
		verify(oauthStateRepository, never()).findByState(any());
	}

	@Test
	void callbackWithUnknownProviderIsProviderError() {
		when(providerRegistry.resolve("bogus")).thenThrow(DomainException.notFound("unknown identity provider"));

		OAuthCallbackResult result = service.handleCallback("bogus", "code", "state", null);

		assertThat(result.error()).isEqualTo(OAuthErrorCode.PROVIDER_ERROR);
	}

	@Test
	void callbackWithMissingStateIsStateInvalid() {
		when(providerRegistry.resolve("google")).thenReturn(google);

		OAuthCallbackResult result = service.handleCallback("google", "code", null, null);

		assertThat(result.error()).isEqualTo(OAuthErrorCode.STATE_INVALID);
	}

	@Test
	void callbackWithUnknownStateIsStateInvalid() {
		when(providerRegistry.resolve("google")).thenReturn(google);
		when(oauthStateRepository.findByState("unknown-state")).thenReturn(Optional.empty());

		OAuthCallbackResult result = service.handleCallback("google", "code", "unknown-state", null);

		assertThat(result.error()).isEqualTo(OAuthErrorCode.STATE_INVALID);
	}

	@Test
	void callbackWithExpiredStateIsStateInvalid() {
		when(providerRegistry.resolve("google")).thenReturn(google);
		OAuthState expired = stateRow("s1", Instant.now().minusSeconds(60), null);
		when(oauthStateRepository.findByState("s1")).thenReturn(Optional.of(expired));

		OAuthCallbackResult result = service.handleCallback("google", "code", "s1", null);

		assertThat(result.error()).isEqualTo(OAuthErrorCode.STATE_INVALID);
	}

	@Test
	void callbackWithAlreadyConsumedStateIsStateInvalid() {
		when(providerRegistry.resolve("google")).thenReturn(google);
		OAuthState consumed = stateRow("s1", Instant.now().plusSeconds(600), Instant.now());
		when(oauthStateRepository.findByState("s1")).thenReturn(Optional.of(consumed));

		OAuthCallbackResult result = service.handleCallback("google", "code", "s1", null);

		assertThat(result.error()).isEqualTo(OAuthErrorCode.STATE_INVALID);
	}

	@Test
	void callbackWhenProviderExchangeFailsIsProviderError() {
		when(providerRegistry.resolve("google")).thenReturn(google);
		OAuthState valid = stateRow("s1", Instant.now().plusSeconds(600), null);
		when(oauthStateRepository.findByState("s1")).thenReturn(Optional.of(valid));
		when(google.exchangeCode(eq("code"), any())).thenThrow(DomainException.unavailable("boom"));

		OAuthCallbackResult result = service.handleCallback("google", "code", "s1", null);

		assertThat(result.error()).isEqualTo(OAuthErrorCode.PROVIDER_ERROR);
		verify(oauthStateRepository).save(argThatConsumed());
	}

	@Test
	void callbackWhenLinkingRejectsIsAccountConflict() {
		when(providerRegistry.resolve("google")).thenReturn(google);
		OAuthState valid = stateRow("s1", Instant.now().plusSeconds(600), null);
		when(oauthStateRepository.findByState("s1")).thenReturn(Optional.of(valid));
		ExternalUserInfo info = new ExternalUserInfo("sub-1", "guest@example.com", true, "Guest");
		when(google.exchangeCode(eq("code"), any())).thenReturn(info);
		when(google.type()).thenReturn(IdentityProviderType.GOOGLE);
		when(identityLinker.findOrLinkOrCreate(IdentityProviderType.GOOGLE, info))
				.thenThrow(DomainException.forbidden("account is not available for sign-in"));

		OAuthCallbackResult result = service.handleCallback("google", "code", "s1", null);

		assertThat(result.error()).isEqualTo(OAuthErrorCode.ACCOUNT_CONFLICT);
	}

	@Test
	void successfulCallbackMintsALoginGrant() {
		when(providerRegistry.resolve("google")).thenReturn(google);
		OAuthState valid = stateRow("s1", Instant.now().plusSeconds(600), null);
		valid.setRedirectPath("/account/bookings");
		when(oauthStateRepository.findByState("s1")).thenReturn(Optional.of(valid));
		ExternalUserInfo info = new ExternalUserInfo("sub-1", "guest@example.com", true, "Guest");
		when(google.exchangeCode(eq("code"), any())).thenReturn(info);
		when(google.type()).thenReturn(IdentityProviderType.GOOGLE);
		User user = new User();
		user.setId(UUID.randomUUID());
		when(identityLinker.findOrLinkOrCreate(IdentityProviderType.GOOGLE, info)).thenReturn(user);

		OAuthCallbackResult result = service.handleCallback("google", "code", "s1", null);

		assertThat(result.success()).isTrue();
		assertThat(result.grant()).isNotBlank();
		assertThat(result.redirectPath()).isEqualTo("/account/bookings");
		verify(loginGrantRepository).save(any(LoginGrant.class));
	}

	@Test
	void completeSessionWithUnknownGrantIsNotFound() {
		when(loginGrantRepository.findByGrantValue("bogus")).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.completeSession("bogus")).isInstanceOf(DomainException.class);
	}

	@Test
	void completeSessionWithAlreadyConsumedGrantIsConflict() {
		LoginGrant grant = grantRow(UUID.randomUUID(), Instant.now().plusSeconds(60), Instant.now());
		when(loginGrantRepository.findByGrantValue("g1")).thenReturn(Optional.of(grant));

		assertThatThrownBy(() -> service.completeSession("g1"))
				.isInstanceOf(DomainException.class)
				.satisfies(ex -> assertThat(((DomainException) ex).getCode())
						.isEqualTo(com.hotelcollection.hotel.exception.ErrorCode.CONFLICT));
	}

	@Test
	void completeSessionWithExpiredGrantIsNotFound() {
		LoginGrant grant = grantRow(UUID.randomUUID(), Instant.now().minusSeconds(60), null);
		when(loginGrantRepository.findByGrantValue("g1")).thenReturn(Optional.of(grant));

		assertThatThrownBy(() -> service.completeSession("g1")).isInstanceOf(DomainException.class);
	}

	@Test
	void completeSessionRedeemsAValidGrantExactlyOnce() {
		UUID userId = UUID.randomUUID();
		LoginGrant grant = grantRow(userId, Instant.now().plusSeconds(60), null);
		when(loginGrantRepository.findByGrantValue("g1")).thenReturn(Optional.of(grant));
		User user = new User();
		user.setId(userId);
		when(userRepository.findByIdWithRoles(userId)).thenReturn(Optional.of(user));
		when(tokenIssuer.issueToken(user)).thenReturn("jwt-token");
		CurrentUser currentUser = new CurrentUser(userId, "guest@example.com", java.util.List.of("guest"),
				java.util.List.of(), Instant.now());
		when(tokenIssuer.currentUserOf(user)).thenReturn(currentUser);

		AuthPayload payload = service.completeSession("g1");

		assertThat(payload.token()).isEqualTo("jwt-token");
		assertThat(payload.me()).isSameAs(currentUser);
		verify(loginGrantRepository).save(argThat(g -> g.getConsumedAt() != null));
	}

	private static OAuthState stateRow(String state, Instant expiresAt, Instant consumedAt) {
		OAuthState row = new OAuthState();
		row.setState(state);
		row.setProvider(IdentityProviderType.GOOGLE);
		row.setNonce("nonce-1");
		row.setCreatedAt(Instant.now());
		row.setExpiresAt(expiresAt);
		row.setConsumedAt(consumedAt);
		return row;
	}

	private static LoginGrant grantRow(UUID userId, Instant expiresAt, Instant consumedAt) {
		LoginGrant grant = new LoginGrant();
		grant.setGrantValue("g1");
		grant.setUserId(userId);
		grant.setCreatedAt(Instant.now());
		grant.setExpiresAt(expiresAt);
		grant.setConsumedAt(consumedAt);
		return grant;
	}

	private static OAuthState argThatConsumed() {
		return org.mockito.ArgumentMatchers.argThat(s -> s.getConsumedAt() != null);
	}

	private static LoginGrant argThat(java.util.function.Predicate<LoginGrant> predicate) {
		return org.mockito.ArgumentMatchers.argThat(predicate::test);
	}
}

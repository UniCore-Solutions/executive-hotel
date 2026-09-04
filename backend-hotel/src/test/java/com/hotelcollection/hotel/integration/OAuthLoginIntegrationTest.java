package com.hotelcollection.hotel.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.ContextConfiguration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelcollection.hotel.entity.OAuthState;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.identity.ExternalIdentityProvider;
import com.hotelcollection.hotel.identity.ExternalUserInfo;
import com.hotelcollection.hotel.identity.IdentityProviderType;
import com.hotelcollection.hotel.repository.ExternalIdentityRepository;
import com.hotelcollection.hotel.repository.LoginGrantRepository;
import com.hotelcollection.hotel.repository.OAuthStateRepository;
import com.hotelcollection.hotel.repository.UserRepository;

/**
 * Full Google SSO round trip over real HTTP, with a fake
 * {@link ExternalIdentityProvider} standing in for Google (no real network
 * possible in CI) — {@link FakeGoogleConfig} registers it because no real
 * {@code GOOGLE_CLIENT_ID} is set in {@code src/test/resources/application.yaml},
 * so the real {@code GoogleIdentityProvider} bean never exists here.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ContextConfiguration(classes = {TestcontainersConfiguration.class, OAuthLoginIntegrationTest.FakeGoogleConfig.class})
class OAuthLoginIntegrationTest {

	@LocalServerPort
	int port;

	@Autowired
	UserRepository userRepository;
	@Autowired
	ExternalIdentityRepository externalIdentityRepository;
	@Autowired
	OAuthStateRepository oauthStateRepository;
	@Autowired
	LoginGrantRepository loginGrantRepository;

	private final ObjectMapper objectMapper = new ObjectMapper();
	// Default redirect policy is NEVER — 302s come back as-is with a Location header.
	private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

	@BeforeEach
	void resetFakeProvider() {
		FakeGoogleProvider.responses.clear();
		FakeGoogleProvider.failNextExchange = false;
	}

	@Test
	void newGoogleUserIsCreatedAndCanCompleteASession() throws Exception {
		String email = "new-google-" + System.nanoTime() + "@example.com";
		String subject = "sub-" + System.nanoTime();
		FakeGoogleProvider.responses.put("code-1", new ExternalUserInfo(subject, email, true, "Jane Doe"));

		String state = startAndExtractState(null);
		HttpResponse<String> callback = callback(state, "code-1", null);
		assertThat(callback.statusCode()).isEqualTo(302);
		String location = callback.headers().firstValue("Location").orElseThrow();
		assertThat(location).contains("/account/oauth-callback?grant=");
		String grant = queryParam(location, "grant");

		Map<String, Object> session = exchangeGrant(grant);
		assertThat(session.get("__status")).isEqualTo(200);
		assertThat(session.get("token")).isNotNull();

		assertThat(userRepository.findByEmailIgnoreCase(email)).isPresent();
		assertThat(externalIdentityRepository.findByProviderAndProviderSubject(IdentityProviderType.GOOGLE, subject))
				.isPresent();
	}

	@Test
	void sameGoogleIdentitySigningInAgainReusesTheSameUser() throws Exception {
		String email = "returning-google-" + System.nanoTime() + "@example.com";
		String subject = "sub-" + System.nanoTime();
		FakeGoogleProvider.responses.put("code-1", new ExternalUserInfo(subject, email, true, "Jane Doe"));

		String firstState = startAndExtractState(null);
		String firstGrant = queryParam(
				callback(firstState, "code-1", null).headers().firstValue("Location").orElseThrow(), "grant");
		exchangeGrant(firstGrant);
		UUID firstUserId = userRepository.findByEmailIgnoreCase(email).orElseThrow().getId();

		String secondState = startAndExtractState(null);
		String secondGrant = queryParam(
				callback(secondState, "code-1", null).headers().firstValue("Location").orElseThrow(), "grant");
		Map<String, Object> secondSession = exchangeGrant(secondGrant);

		assertThat(secondSession.get("__status")).isEqualTo(200);
		assertThat(userRepository.findByEmailIgnoreCase(email).orElseThrow().getId()).isEqualTo(firstUserId);
		assertThat(externalIdentityRepository.findByUserId(firstUserId)).hasSize(1);
	}

	@Test
	void missingStateIsRejected() throws Exception {
		HttpResponse<String> callback = callback(null, "some-code", null);
		assertThat(location(callback)).contains("oauthError=state_invalid");
	}

	@Test
	void unknownStateIsRejected() throws Exception {
		HttpResponse<String> callback = callback("not-a-real-state", "some-code", null);
		assertThat(location(callback)).contains("oauthError=state_invalid");
	}

	@Test
	void expiredStateIsRejected() throws Exception {
		String state = startAndExtractState(null);
		OAuthState row = oauthStateRepository.findByState(state).orElseThrow();
		row.setExpiresAt(Instant.now().minusSeconds(60));
		oauthStateRepository.save(row);

		HttpResponse<String> callback = callback(state, "some-code", null);
		assertThat(location(callback)).contains("oauthError=state_invalid");
	}

	@Test
	void reusedStateIsRejectedOnTheSecondAttempt() throws Exception {
		String email = "replay-" + System.nanoTime() + "@example.com";
		FakeGoogleProvider.responses.put("code-1",
				new ExternalUserInfo("sub-" + System.nanoTime(), email, true, "Name"));
		String state = startAndExtractState(null);

		HttpResponse<String> first = callback(state, "code-1", null);
		assertThat(location(first)).contains("/account/oauth-callback?grant=");

		HttpResponse<String> second = callback(state, "code-1", null);
		assertThat(location(second)).contains("oauthError=state_invalid");
	}

	@Test
	void userCancellingConsentIsAccessDenied() throws Exception {
		String state = startAndExtractState(null);
		HttpResponse<String> callback = callback(state, null, "access_denied");
		assertThat(location(callback)).contains("oauthError=access_denied");
	}

	@Test
	void providerExchangeFailureIsProviderErrorWithNoLeakedDetail() throws Exception {
		String state = startAndExtractState(null);
		FakeGoogleProvider.failNextExchange = true;

		HttpResponse<String> callback = callback(state, "any-code", null);

		String location = location(callback);
		assertThat(location).contains("oauthError=provider_error");
		assertThat(location).doesNotContain("Exception").doesNotContain("secret");
	}

	@Test
	void sessionExchangeWithUnknownGrantIs404() throws Exception {
		Map<String, Object> result = exchangeGrant("not-a-real-grant");
		assertThat(result.get("__status")).isEqualTo(404);
	}

	@Test
	void sessionExchangeWithAnAlreadyUsedGrantIs409() throws Exception {
		String email = "reuse-grant-" + System.nanoTime() + "@example.com";
		FakeGoogleProvider.responses.put("code-1",
				new ExternalUserInfo("sub-" + System.nanoTime(), email, true, "Name"));
		String state = startAndExtractState(null);
		String grant = queryParam(callback(state, "code-1", null).headers().firstValue("Location").orElseThrow(),
				"grant");

		Map<String, Object> firstExchange = exchangeGrant(grant);
		assertThat(firstExchange.get("__status")).isEqualTo(200);

		Map<String, Object> secondExchange = exchangeGrant(grant);
		assertThat(secondExchange.get("__status")).isEqualTo(409);
	}

	private String startAndExtractState(String redirect) throws Exception {
		String path = "/api/auth/google" + (redirect != null ? "?redirect=" + redirect : "");
		HttpResponse<String> response = get(path);
		assertThat(response.statusCode()).isEqualTo(302);
		String location = response.headers().firstValue("Location").orElseThrow();
		return queryParam(location, "state");
	}

	private HttpResponse<String> callback(String state, String code, String error) throws Exception {
		StringBuilder query = new StringBuilder("?");
		if (state != null) {
			query.append("state=").append(state).append('&');
		}
		if (code != null) {
			query.append("code=").append(code).append('&');
		}
		if (error != null) {
			query.append("error=").append(error).append('&');
		}
		return get("/api/auth/google/callback" + query);
	}

	private HttpResponse<String> get(String path) throws Exception {
		HttpRequest request = HttpRequest.newBuilder().uri(URI.create("http://localhost:" + port + path))
				.timeout(Duration.ofSeconds(10)).GET().build();
		return http.send(request, HttpResponse.BodyHandlers.ofString());
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> exchangeGrant(String grant) throws Exception {
		HttpRequest request = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + "/api/auth/oauth/session"))
				.timeout(Duration.ofSeconds(10))
				.header("Content-Type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(Map.of("grant", grant))))
				.build();
		HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
		Map<String, Object> parsed = objectMapper.readValue(response.body(), Map.class);
		parsed.put("__status", response.statusCode());
		return parsed;
	}

	private static String location(HttpResponse<String> response) {
		return response.headers().firstValue("Location").orElseThrow();
	}

	private static String queryParam(String location, String name) {
		String query = URI.create(location).getRawQuery();
		for (String pair : query.split("&")) {
			String[] kv = pair.split("=", 2);
			if (kv[0].equals(name)) {
				return URLDecoder.decode(kv[1], StandardCharsets.UTF_8);
			}
		}
		return null;
	}

	@TestConfiguration
	static class FakeGoogleConfig {
		@Bean
		ExternalIdentityProvider fakeGoogleProvider() {
			return new FakeGoogleProvider();
		}
	}

	/** Stands in for Google — {@code exchangeCode}'s {@code code} argument is
	 * looked up directly against a test-populated map instead of hitting any
	 * network endpoint. */
	static class FakeGoogleProvider implements ExternalIdentityProvider {
		static final Map<String, ExternalUserInfo> responses = new ConcurrentHashMap<>();
		static volatile boolean failNextExchange = false;

		@Override
		public IdentityProviderType type() {
			return IdentityProviderType.GOOGLE;
		}

		@Override
		public String buildAuthorizationUrl(String state, String nonce) {
			return "https://accounts.google.com/fake-authorize?state=" + state + "&nonce=" + nonce;
		}

		@Override
		public ExternalUserInfo exchangeCode(String code, String expectedNonce) {
			if (failNextExchange) {
				failNextExchange = false;
				throw DomainException.unavailable("simulated google token exchange failure");
			}
			ExternalUserInfo info = responses.get(code);
			if (info == null) {
				throw DomainException.unavailable("no fake response configured for code " + code);
			}
			return info;
		}
	}
}

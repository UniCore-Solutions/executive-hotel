package com.hotelcollection.hotel.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.hotelcollection.hotel.integration.TestcontainersConfiguration;

/**
 * Rate limiting on the anonymous REST surface: auth (credential brute force)
 * and — the reason this exists — reservation creation, where every call holds
 * a physical room unit for 15 minutes and unlimited anonymous creates would
 * let a script deny the property's entire inventory. Ordinary GraphQL reads
 * are never limited. The limiter is enabled here explicitly (the shared suite
 * config keeps it off).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ContextConfiguration(classes = TestcontainersConfiguration.class)
@TestPropertySource(properties = "app.security.rate-limit-enabled=true")
class RateLimitIntegrationTest {

	@Autowired
	MockMvc mvc;

	@Test
	void restRegisterIsRateLimited() throws Exception {
		String body = "{\"firstName\":\"x\",\"lastName\":\"y\",\"email\":\"rl@example.com\","
				+ "\"password\":\"Password123!\"}";
		boolean saw429 = false;
		for (int i = 0; i < 25; i++) {
			int status = mvc.perform(post("/api/v1/auth/register")
					.contentType(MediaType.APPLICATION_JSON).content(body))
					.andReturn().getResponse().getStatus();
			if (status == 429) {
				saw429 = true;
				break;
			}
		}
		org.assertj.core.api.Assertions.assertThat(saw429)
				.as("REST register must eventually be rate limited")
				.isTrue();
	}

	/**
	 * The inventory-exhaustion guard. Bodies are intentionally invalid — the
	 * limiter runs as a servlet filter, ahead of any controller or validation,
	 * so a burst is rejected with 429 before it can ever reach
	 * {@code BookingService#create} and take a hold.
	 */
	@Test
	void anonymousReservationCreationIsRateLimited() throws Exception {
		boolean saw429 = false;
		for (int i = 0; i < 12; i++) {
			int status = mvc.perform(post("/api/v1/reservations")
					.header("Idempotency-Key", "burst-" + i)
					.contentType(MediaType.APPLICATION_JSON).content("{}"))
					.andReturn().getResponse().getStatus();
			if (status == 429) {
				saw429 = true;
				break;
			}
		}
		org.assertj.core.api.Assertions.assertThat(saw429)
				.as("anonymous reservation creation must be rate limited — "
						+ "each call holds physical inventory for 15 minutes")
				.isTrue();
	}

	/**
	 * Budgets are per policy, so exhausting the reservation budget must leave
	 * the auth budget untouched (and vice versa).
	 */
	@Test
	void oneEndpointsBurstDoesNotConsumeAnothersBudget() throws Exception {
		for (int i = 0; i < 12; i++) {
			mvc.perform(post("/api/v1/reservations")
					.header("Idempotency-Key", "isolation-" + i)
					.contentType(MediaType.APPLICATION_JSON).content("{}"));
		}
		int status = mvc.perform(post("/api/v1/auth/login")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"nobody@example.com\",\"password\":\"wrong\"}"))
				.andReturn().getResponse().getStatus();
		org.assertj.core.api.Assertions.assertThat(status)
				.as("login must not be rate limited by a reservation burst")
				.isNotEqualTo(429);
	}

	/**
	 * Regression guard. {@code GET /api/v1/payments/{id}} is the status endpoint a
	 * guest's browser polls every 2s while an async settlement resolves. An
	 * earlier version of this filter counted those reads against the same budget
	 * as the writes, so a handful of polls exhausted it and the guest's own
	 * capture came back 429 — caught by a live end-to-end run, not by a test.
	 * Safe methods must never be limited.
	 */
	@Test
	void pollingAPaymentStatusIsNeverRateLimited() throws Exception {
		UUID paymentId = UUID.randomUUID();
		for (int i = 0; i < 40; i++) {
			int status = mvc.perform(get("/api/v1/payments/" + paymentId)
					.param("guestEmail", "poller@example.com"))
					.andReturn().getResponse().getStatus();
			org.assertj.core.api.Assertions.assertThat(status)
					.as("payment status polling must never be rate limited (attempt %d)", i + 1)
					.isNotEqualTo(429);
		}
	}

	/**
	 * Regression guard for a rate-limit bypass found by live probing, not by any
	 * test: the filter used to read {@code X-Forwarded-For} unconditionally, so
	 * rotating it minted a fresh budget per request and every call sailed past a
	 * limit that had already tripped for the same real client. The header is now
	 * honoured only from a configured trusted proxy, and none is configured here.
	 */
	@Test
	void rotatingXForwardedForCannotEscapeTheBudget() throws Exception {
		boolean saw429 = false;
		for (int i = 0; i < 12; i++) {
			int status = mvc.perform(post("/api/v1/reservations")
					.header("X-Forwarded-For", "10.9.9." + i)
					.header("Idempotency-Key", "spoof-" + i)
					.contentType(MediaType.APPLICATION_JSON).content("{}"))
					.andReturn().getResponse().getStatus();
			if (status == 429) {
				saw429 = true;
				break;
			}
		}
		org.assertj.core.api.Assertions.assertThat(saw429)
				.as("a client-supplied X-Forwarded-For must not create a fresh rate-limit budget")
				.isTrue();
	}

	@Test
	void ordinaryGraphqlTrafficIsNotRateLimited() throws Exception {
		String body = "{\"query\":\"query { hotels { id name } }\"}";
		for (int i = 0; i < 30; i++) {
			mvc.perform(post("/graphql").contentType(MediaType.APPLICATION_JSON).content(body))
					.andExpect(status().isOk());
		}
	}
}

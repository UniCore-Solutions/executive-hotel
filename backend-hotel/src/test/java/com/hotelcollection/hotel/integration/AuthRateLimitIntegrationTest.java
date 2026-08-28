package com.hotelcollection.hotel.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
 * Auth rate limiting: the anonymous REST auth endpoints (login/register)
 * are limited per client IP; ordinary GraphQL traffic is never limited.
 * 20 requests per minute per window. The limiter is enabled here explicitly
 * (the shared suite config keeps it off). The GraphQL auth mutations no
 * longer exist (API rule: GraphQL = READ, REST = WRITE/ACTION).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ContextConfiguration(classes = TestcontainersConfiguration.class)
@TestPropertySource(properties = "app.security.auth-rate-limit-enabled=true")
class AuthRateLimitIntegrationTest {

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

	@Test
	void ordinaryGraphqlTrafficIsNotRateLimited() throws Exception {
		String body = "{\"query\":\"query { hotels { id name } }\"}";
		for (int i = 0; i < 30; i++) {
			mvc.perform(post("/graphql").contentType(MediaType.APPLICATION_JSON).content(body))
					.andExpect(status().isOk());
		}
	}
}
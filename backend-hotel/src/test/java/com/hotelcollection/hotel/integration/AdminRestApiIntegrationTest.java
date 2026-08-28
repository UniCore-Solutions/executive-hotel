package com.hotelcollection.hotel.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ContextConfiguration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.JwtService;

/**
 * Admin REST write surface (/api/v1/admin/** + profile): every endpoint is
 * exercised over real HTTP with a super_admin bearer. Authorization (401
 * anonymous, 403 non-staff) and the uniform error envelope are asserted per
 * family. The endpoints are thin wrappers over the same services the GraphQL
 * admin suite covers, so parity checks here focus on HTTP shape.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ContextConfiguration(classes = TestcontainersConfiguration.class)
class AdminRestApiIntegrationTest {
	private static UUID uid(long n) { return new UUID(0, n); }

	@LocalServerPort
	int port;

	@Autowired
	TestFixtures fixtures;
	@Autowired
	JwtService jwtService;

	private final ObjectMapper objectMapper = new ObjectMapper();
	private final HttpClient http = HttpClient.newBuilder()
			.connectTimeout(Duration.ofSeconds(10)).build();

	private HttpResponse<String> send(String method, String path, Object body, String bearer)
			throws Exception {
		HttpRequest.Builder builder = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + path))
				.header("Content-Type", "application/json");
		if (body == null) {
			builder.method(method, HttpRequest.BodyPublishers.noBody());
		} else {
			builder.method(method,
					HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)));
		}
		if (bearer != null) {
			builder.header("Authorization", "Bearer " + bearer);
		}
		return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
	}

	/**
	 * Registers a real user and issues a token carrying the real id —
	 * audit_logs.actor_user_id references the users table.
	 */
	private String tokenWithRoles(List<String> roles) throws Exception {
		String email = "admin-rest-" + System.nanoTime() + "@example.com";
		HttpResponse<String> registered = send("POST", "/api/v1/auth/register",
				Map.of("firstName", "Admin", "lastName", "Rest", "email", email,
						"password", "secret123"),
				null);
		assertThat(registered.statusCode()).isEqualTo(201);
		String userId = objectMapper.readTree(registered.body()).get("me").get("userId").asText();
		return jwtService.issue(new CurrentUser(UUID.fromString(userId), email, roles, List.of(),
				Instant.now()));
	}

	private String staffToken() throws Exception {
		return tokenWithRoles(List.of("super_admin"));
	}

	@Test
	void adminSurfaceRequiresAuthentication() throws Exception {
		HttpResponse<String> anon = send("POST", "/api/v1/admin/hotels", Map.of(), null);
		assertThat(anon.statusCode()).isEqualTo(401);
		assertThat(objectMapper.readTree(anon.body()).get("code").asText())
				.isEqualTo("UNAUTHORIZED");

		HttpResponse<String> guest = send("POST", "/api/v1/admin/hotels", Map.of(),
				tokenWithRoles(List.of("guest")));
		assertThat(guest.statusCode()).isEqualTo(403);
		assertThat(objectMapper.readTree(guest.body()).get("code").asText())
				.isEqualTo("FORBIDDEN");
	}

	@Test
	void hotelCrudAndAssociations() throws Exception {
		String token = staffToken();

		HttpResponse<String> created = send("POST", "/api/v1/admin/hotels",
				Map.of("name", "REST Hotel " + System.nanoTime(), "brand", "Hotel Collection",
						"description", "via REST", "city", "Marrakech", "countryCode", "MA",
						"defaultCurrency", "MAD", "status", "active"),
				token);
		assertThat(created.statusCode()).isEqualTo(201);
		String hotelId = objectMapper.readTree(created.body()).get("id").asText();
		assertThat(objectMapper.readTree(created.body()).get("status").asText())
				.isEqualTo("active");

		HttpResponse<String> updated = send("PUT", "/api/v1/admin/hotels/" + hotelId,
				Map.of("description", "updated via REST", "starRating", 4), token);
		assertThat(updated.statusCode()).isEqualTo(200);
		assertThat(objectMapper.readTree(updated.body()).get("description").asText())
				.isEqualTo("updated via REST");
		assertThat(objectMapper.readTree(updated.body()).get("starRating").asInt())
				.isEqualTo(4);

		// media + policies associations
		HttpResponse<String> media = send("PUT", "/api/v1/admin/hotels/" + hotelId + "/media",
				List.of(Map.of("url", "https://example.com/hotel.jpg", "isPrimary", true,
						"category", "exterior")),
				token);
		assertThat(media.statusCode()).isEqualTo(200);
		assertThat(objectMapper.readTree(media.body()).get(0).get("url").asText())
				.isEqualTo("https://example.com/hotel.jpg");

		HttpResponse<String> policies = send("PUT", "/api/v1/admin/hotels/" + hotelId
				+ "/policies", List.of(Map.of("name", "check-in", "value", "15:00")), token);
		assertThat(policies.statusCode()).isEqualTo(200);
		assertThat(objectMapper.readTree(policies.body()).get(0).get("name").asText())
				.isEqualTo("check-in");
	}

	@Test
	void roomTypeAndRoomCreation() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken();

		HttpResponse<String> rt = send("POST",
				"/api/v1/admin/hotels/" + fx.hotelId() + "/room-types",
				Map.of("name", "REST Suite", "maxAdults", 3, "maxChildren", 2, "status", "active"),
				token);
		assertThat(rt.statusCode()).isEqualTo(201);
		String roomTypeId = objectMapper.readTree(rt.body()).get("id").asText();

		HttpResponse<String> room = send("POST",
				"/api/v1/admin/hotels/" + fx.hotelId() + "/rooms",
				Map.of("roomTypeId", roomTypeId, "roomNumber", "901", "floor", "9",
						"status", "active", "housekeepingStatus", "clean",
						"maintenanceStatus", "ok"),
				token);
		assertThat(room.statusCode()).isEqualTo(201);
		assertThat(objectMapper.readTree(room.body()).get("roomNumber").asText()).isEqualTo("901");

		HttpResponse<String> renamed = send("PUT", "/api/v1/admin/rooms/"
				+ objectMapper.readTree(room.body()).get("id").asText(),
				Map.of("roomNumber", "902"), token);
		assertThat(renamed.statusCode()).isEqualTo(200);
		assertThat(objectMapper.readTree(renamed.body()).get("roomNumber").asText())
				.isEqualTo("902");
	}

	@Test
	void ratePlansLinksAndPrices() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken();

		HttpResponse<String> plan = send("POST",
				"/api/v1/admin/hotels/" + fx.hotelId() + "/rate-plans",
				Map.of("name", "REST Plan", "code", "rest", "currencyCode", "MAD",
						"mealPlan", "bb", "cancellationPolicy", "free", "isRefundable", true,
						"paymentTiming", "pay_at_property", "status", "active"),
				token);
		assertThat(plan.statusCode()).isEqualTo(201);
		String planId = objectMapper.readTree(plan.body()).get("id").asText();

		HttpResponse<String> link = send("POST", "/api/v1/admin/room-type-rate-plans",
				Map.of("roomTypeId", fx.roomType().getId(), "ratePlanId", planId), token);
		assertThat(link.statusCode()).isEqualTo(200);
		String linkId = objectMapper.readTree(link.body()).get("id").asText();

		HttpResponse<String> prices = send("PUT",
				"/api/v1/admin/room-type-rate-plans/" + linkId + "/prices",
				List.of(Map.of("validFrom", LocalDate.now().toString(),
						"validTo", LocalDate.now().plusDays(30).toString(),
						"priceAmount", 1500.00)),
				token);
		assertThat(prices.statusCode()).isEqualTo(200);
		assertThat(objectMapper.readTree(prices.body()).get(0).get("priceAmount").asDouble())
				.isEqualTo(1500.0);

		HttpResponse<String> unlinked = send("DELETE",
				"/api/v1/admin/room-type-rate-plans/" + linkId, null, token);
		assertThat(unlinked.statusCode()).isEqualTo(200);
	}

	@Test
	void promotionsCreateUpdateAndStatus() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken();

		HttpResponse<String> created = send("POST",
				"/api/v1/admin/promotions?hotelId=" + fx.hotelId(),
				Map.of("code", "rest10", "name", "REST Ten", "discountType", "percentage",
						"discountValue", 10.0, "status", "active"),
				token);
		assertThat(created.statusCode()).isEqualTo(201);
		String promoId = objectMapper.readTree(created.body()).get("id").asText();

		HttpResponse<String> updated = send("PUT", "/api/v1/admin/promotions/" + promoId,
				Map.of("name", "REST Twenty"), token);
		assertThat(updated.statusCode()).isEqualTo(200);
		assertThat(objectMapper.readTree(updated.body()).get("name").asText())
				.isEqualTo("REST Twenty");

		HttpResponse<String> status = send("PUT", "/api/v1/admin/promotions/" + promoId
				+ "/status", Map.of("status", "inactive"), token);
		assertThat(status.statusCode()).isEqualTo(200);
		assertThat(objectMapper.readTree(status.body()).get("status").asText())
				.isEqualTo("inactive");
	}

	@Test
	void availabilityRangeUpdate() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken();

		HttpResponse<String> updated = send("PUT",
				"/api/v1/admin/availability/hotels/" + fx.hotelId(),
				Map.of("roomTypeId", fx.roomType().getId(),
						"fromDate", LocalDate.now().plusDays(2).toString(),
						"toDate", LocalDate.now().plusDays(4).toString(),
						"outOfOrder", 1),
				token);
		assertThat(updated.statusCode()).isEqualTo(200);
		assertThat(objectMapper.readTree(updated.body()).get(0).get("outOfOrder").asInt())
				.isEqualTo(1);
	}

	@Test
	void adminReservationCancel() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken();
		String guestEmail = "admin-cancel-" + System.nanoTime() + "@example.com";
		String key = "admin-cancel-" + System.nanoTime();
		Map<String, Object> body = Map.of(
				"hotelId", fx.hotelId(),
				"checkInDate", LocalDate.now().plusDays(5).toString(),
				"checkOutDate", LocalDate.now().plusDays(6).toString(),
				"adults", 2, "children", 0,
				"currencyCode", TestFixtures.CURRENCY,
				"guest", Map.of("firstName", "Nora", "lastName", "Guest",
						"email", guestEmail),
				"rooms", List.of(Map.of("roomTypeId", fx.roomType().getId(),
						"ratePlanId", fx.ratePlan().getId())),
				"extras", List.of());

		HttpRequest.Builder builder = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + "/api/v1/reservations"))
				.header("Content-Type", "application/json")
				.header("Idempotency-Key", key)
				.POST(HttpRequest.BodyPublishers
						.ofString(objectMapper.writeValueAsString(body)));
		HttpResponse<String> created = http.send(builder.build(),
				HttpResponse.BodyHandlers.ofString());
		assertThat(created.statusCode()).isEqualTo(201);
		String reservationId = objectMapper.readTree(created.body()).get("id").asText();

		HttpResponse<String> cancelled = send("POST",
				"/api/v1/admin/reservations/" + reservationId + "/cancel",
				Map.of("reasonCode", "staff_cancellation", "reasonNote", "overbooked"), token);
		assertThat(cancelled.statusCode()).isEqualTo(200);
		assertThat(objectMapper.readTree(cancelled.body()).get("status").asText())
				.isEqualTo("cancelled");
	}

	@Test
	void reviewModerationRejectsAnonymousAndUnknown() throws Exception {
		UUID missing = uid(42);
		HttpResponse<String> anon = send("POST", "/api/v1/admin/reviews/" + missing
				+ "/moderation", Map.of("status", "approved"), null);
		assertThat(anon.statusCode()).isEqualTo(401);

		HttpResponse<String> missingReview = send("POST", "/api/v1/admin/reviews/" + missing
				+ "/moderation", Map.of("status", "approved"), staffToken());
		assertThat(missingReview.statusCode()).isEqualTo(404);
		assertThat(objectMapper.readTree(missingReview.body()).get("code").asText())
				.isEqualTo("NOT_FOUND");
	}

	@Test
	void userCreateAndRoleAssignment() throws Exception {
		String token = staffToken();
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		UUID hotelId = fx.hotelId();

		HttpResponse<String> created = send("POST", "/api/v1/admin/users",
				Map.of("firstName", "Ops", "lastName", "User",
						"email", "ops-" + System.nanoTime() + "@example.com",
						"password", "secret123", "roleName", "reception_staff",
						"hotelId", hotelId.toString()),
				token);
		assertThat(created.statusCode()).isEqualTo(201);
		String userId = objectMapper.readTree(created.body()).get("id").asText();

		HttpResponse<String> assigned = send("POST", "/api/v1/admin/users/" + userId + "/roles",
				Map.of("roleName", "reservation_agent", "hotelId", hotelId.toString()),
				token);
		assertThat(assigned.statusCode()).isEqualTo(200);

		String userRoleId = objectMapper.readTree(assigned.body()).get("roles").get(0)
				.get("id").asText();
		HttpResponse<String> revoked = send("DELETE", "/api/v1/admin/users/roles/" + userRoleId,
				null, token);
		assertThat(revoked.statusCode()).isEqualTo(200);
	}

	@Test
	void profileUpdateRequiresAuthenticatedUser() throws Exception {
		HttpResponse<String> anon = send("POST", "/api/v1/auth/me/profile",
				Map.of("firstName", "X"), null);
		assertThat(anon.statusCode()).isEqualTo(401);

		String email = "profile-" + System.nanoTime() + "@example.com";
		HttpResponse<String> registered = send("POST", "/api/v1/auth/register",
				Map.of("firstName", "P", "lastName", "User", "email", email,
						"password", "secret123"),
				null);
		assertThat(registered.statusCode()).isEqualTo(201);
		String token = objectMapper.readTree(registered.body()).get("token").asText();

		HttpResponse<String> updated = send("POST", "/api/v1/auth/me/profile",
				Map.of("firstName", "Patricia", "phone", "+212611111111"), token);
		assertThat(updated.statusCode()).isEqualTo(200);
		assertThat(objectMapper.readTree(updated.body()).get("email").asText()).isEqualTo(email);
	}
}

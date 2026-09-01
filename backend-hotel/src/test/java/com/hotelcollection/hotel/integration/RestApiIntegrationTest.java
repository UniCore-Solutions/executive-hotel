package com.hotelcollection.hotel.integration;
import com.hotelcollection.hotel.entity.Guest;

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
 * REST surface (/api/v1) over real HTTP: auth round-trip, reservation
 * lifecycle with Idempotency-Key, payment/invoice authz, review guard, error
 * envelope, and auth rate limiting. Parity with the GraphQL taxonomy is
 * asserted via the {code, message} envelope.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ContextConfiguration(classes = TestcontainersConfiguration.class)
class RestApiIntegrationTest {
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

	private HttpResponse<String> post(String path, Object body, String bearer) throws Exception {
		HttpRequest.Builder builder = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + path))
				.header("Content-Type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)));
		if (bearer != null) {
			builder.header("Authorization", "Bearer " + bearer);
		}
		return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
	}

	private HttpResponse<String> postWithKey(String path, Object body, String idempotencyKey,
			String bearer) throws Exception {
		HttpRequest.Builder builder = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + path))
				.header("Content-Type", "application/json")
				.header("Idempotency-Key", idempotencyKey)
				.POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)));
		if (bearer != null) {
			builder.header("Authorization", "Bearer " + bearer);
		}
		return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
	}

	private String staffToken() {
		return jwtService.issue(new CurrentUser(uid(999), "staff@example.com", List.of("super_admin"),
				List.of(), Instant.now()));
	}

	private HttpResponse<String> send(String method, String path, String bearer) throws Exception {
		HttpRequest.Builder builder = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + path));
		if (bearer != null) {
			builder.header("Authorization", "Bearer " + bearer);
		}
		return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
	}

	@Test
	void errorEnvelopeAcrossSecurityFilterAndMvc() throws Exception {
		String token = staffToken();

		// unknown route outside /api/v1 → filter-level denyAll → 403 envelope
		HttpResponse<String> denied = send("GET", "/nope", token);
		assertThat(denied.statusCode()).isEqualTo(403);
		assertThat(objectMapper.readTree(denied.body()).get("code").asText())
				.isEqualTo("FORBIDDEN");

		// unknown /api/v1 route → MVC NoResourceFoundException → 404 envelope
		HttpResponse<String> missing = send("GET", "/api/v1/no-such-route", token);
		assertThat(missing.statusCode()).isEqualTo(404);
		assertThat(objectMapper.readTree(missing.body()).get("code").asText())
				.isEqualTo("NOT_FOUND");

		// malformed UUID path variable → 400 VALIDATION envelope
		HttpResponse<String> malformed = post("/api/v1/payments/not-a-uuid/capture",
				Map.of(), token);
		assertThat(malformed.statusCode()).isEqualTo(400);
		assertThat(objectMapper.readTree(malformed.body()).get("code").asText())
				.isEqualTo("VALIDATION");

		// envelope carries path + traceId for correlation
		com.fasterxml.jackson.databind.JsonNode body =
				objectMapper.readTree(denied.body());
		assertThat(body.get("path").asText()).isEqualTo("/nope");
		assertThat(body.get("traceId").asText()).isNotBlank();
	}

	@Test
	void authRoundTrip() throws Exception {
		String email = "rita-" + System.nanoTime() + "@example.com";

		HttpResponse<String> registered = post("/api/v1/auth/register",
				Map.of("firstName", "Rita", "lastName", "Guest", "email", email,
						"password", "secret123"),
				null);
		assertThat(registered.statusCode()).isEqualTo(201);
		String token = objectMapper.readTree(registered.body()).get("token").asText();
		assertThat(token).isNotBlank();

		HttpResponse<String> login = post("/api/v1/auth/login",
				Map.of("email", email, "password", "secret123"), null);
		assertThat(login.statusCode()).isEqualTo(200);
		assertThat(objectMapper.readTree(login.body()).get("token").asText()).isNotBlank();

		// wrong password → FORBIDDEN envelope (parity with GraphQL)
		HttpResponse<String> bad = post("/api/v1/auth/login",
				Map.of("email", email, "password", "wrong"), null);
		assertThat(bad.statusCode()).isEqualTo(403);
		assertThat(objectMapper.readTree(bad.body()).get("code").asText()).isEqualTo("FORBIDDEN");
	}

	@Test
	void reservationLifecycleWithIdempotencyKey() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String guestEmail = "amine-rest-" + System.nanoTime() + "@example.com";
		Map<String, Object> body = Map.of(
				"hotelId", fx.hotelId(),
				"checkInDate", LocalDate.now().plusDays(5).toString(),
				"checkOutDate", LocalDate.now().plusDays(8).toString(),
				"adults", 2, "children", 0,
				"currencyCode", TestFixtures.CURRENCY,
				"guest", Map.of("firstName", "Amine", "lastName", "El Idrissi",
						"email", guestEmail,
						"phone", "+212600000000", "countryCode", "MA"),
				"rooms", List.of(Map.of("roomTypeId", fx.roomType().getId(),
						"ratePlanId", fx.ratePlan().getId())),
				"extras", List.of());

		// missing Idempotency-Key → 400 VALIDATION
		HttpResponse<String> missing = post("/api/v1/reservations", body, null);
		assertThat(missing.statusCode()).isEqualTo(400);
		assertThat(objectMapper.readTree(missing.body()).get("code").asText())
				.isEqualTo("VALIDATION");

		// create → 201 with reference
		String key = "rest-lifecycle-" + System.nanoTime();
		HttpResponse<String> created = postWithKey("/api/v1/reservations", body, key, null);
		assertThat(created.statusCode()).isEqualTo(201);
		String reference = objectMapper.readTree(created.body()).get("reference").asText();
		assertThat(reference).startsWith("RC-");

		// replay of the same key → 200 with the same reservation
		HttpResponse<String> replay = postWithKey("/api/v1/reservations", body, key, null);
		assertThat(replay.statusCode()).isEqualTo(200);
		assertThat(objectMapper.readTree(replay.body()).get("reference").asText())
				.isEqualTo(reference);

		// cancel → cancelled reservation
		HttpResponse<String> cancelled = post("/api/v1/reservations/" + reference + "/cancel",
				Map.of("email", guestEmail, "reasonCode", "guest_changed_plans",
						"reasonNote", "plans changed"),
				null);
		assertThat(cancelled.statusCode()).isEqualTo(200);
		assertThat(objectMapper.readTree(cancelled.body()).get("status").asText())
				.isEqualTo("cancelled");
	}

	@Test
	void paymentAndInvoiceRequireAuthenticatedActor() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String key = "rest-pay-" + System.nanoTime();
		String guestEmail = "pay-rest-" + System.nanoTime() + "@example.com";
		Map<String, Object> body = Map.of(
				"hotelId", fx.hotelId(),
				"checkInDate", LocalDate.now().plusDays(6).toString(),
				"checkOutDate", LocalDate.now().plusDays(7).toString(),
				"adults", 2, "children", 0,
				"currencyCode", TestFixtures.CURRENCY,
				"guest", Map.of("firstName", "Sara", "lastName", "Guest", "email", guestEmail),
				"rooms", List.of(Map.of("roomTypeId", fx.roomType().getId(),
						"ratePlanId", fx.ratePlan().getId())),
				"extras", List.of());
		HttpResponse<String> created = postWithKey("/api/v1/reservations", body, key, null);
		assertThat(created.statusCode()).isEqualTo(201);
		String reference = objectMapper.readTree(created.body()).get("reference").asText();
		String reservationId = objectMapper.readTree(created.body()).get("id").asText();

		// anonymous payment, no guest-email proof → 401 UNAUTHORIZED
		HttpResponse<String> anon = post("/api/v1/payments",
				Map.of("reservationId", UUID.fromString(reservationId), "amount", 1000.0,
						"currencyCode", TestFixtures.CURRENCY, "provider", "mock",
						"idempotencyKey", "rest-pay-anon-" + System.nanoTime()),
				null);
		assertThat(anon.statusCode()).isEqualTo(401);
		assertThat(objectMapper.readTree(anon.body()).get("code").asText())
				.isEqualTo("UNAUTHORIZED");

		// staff payment → 201, capture → captured, invoice issued idempotently
		String staff = staffToken();
		HttpResponse<String> paid = post("/api/v1/payments",
				Map.of("reservationId", UUID.fromString(reservationId), "amount", 1000.0,
						"currencyCode", TestFixtures.CURRENCY, "provider", "mock",
						"idempotencyKey", "rest-pay-staff-" + System.nanoTime()),
				staff);
		assertThat(paid.statusCode()).isEqualTo(201);
		String paymentId = objectMapper.readTree(paid.body()).get("id").asText();

		HttpResponse<String> captured = post("/api/v1/payments/" + paymentId + "/capture",
				Map.of(), staff);
		assertThat(captured.statusCode()).isEqualTo(200);
		assertThat(objectMapper.readTree(captured.body()).get("status").asText())
				.isEqualTo("captured");

		HttpResponse<String> invoice = post("/api/v1/reservations/" + reference + "/invoice",
				Map.of("email", guestEmail), staff);
		assertThat(invoice.statusCode()).isEqualTo(200);
		String invoiceNumber = objectMapper.readTree(invoice.body()).get("invoiceNumber").asText();
		assertThat(invoiceNumber).isEqualTo("INV-" + reference);

		HttpResponse<String> replayInvoice = post("/api/v1/reservations/" + reference + "/invoice",
				Map.of("email", guestEmail), staff);
		assertThat(objectMapper.readTree(replayInvoice.body()).get("invoiceNumber").asText())
				.isEqualTo(invoiceNumber);
	}

	@Test
	void accountlessGuestCanPayWithGuestEmail() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String guestEmail = "pay-guest-" + System.nanoTime() + "@example.com";
		Map<String, Object> body = Map.of(
				"hotelId", fx.hotelId(),
				"checkInDate", LocalDate.now().plusDays(9).toString(),
				"checkOutDate", LocalDate.now().plusDays(10).toString(),
				"adults", 2, "children", 0,
				"currencyCode", TestFixtures.CURRENCY,
				"guest", Map.of("firstName", "Omar", "lastName", "Guest", "email", guestEmail),
				"rooms", List.of(Map.of("roomTypeId", fx.roomType().getId(),
						"ratePlanId", fx.ratePlan().getId())),
				"extras", List.of());
		HttpResponse<String> created = postWithKey("/api/v1/reservations", body,
				"rest-pay-guest-key-" + System.nanoTime(), null);
		assertThat(created.statusCode()).isEqualTo(201);
		String reservationId = objectMapper.readTree(created.body()).get("id").asText();

		// anonymous payment with the guest email as proof of possession → 201
		HttpResponse<String> anonPay = post("/api/v1/payments",
				Map.of("reservationId", UUID.fromString(reservationId), "amount", 1000.0,
						"currencyCode", TestFixtures.CURRENCY, "provider", "mock",
						"idempotencyKey", "rest-pay-guest-key2-" + System.nanoTime(),
						"guestEmail", guestEmail),
				null);
		assertThat(anonPay.statusCode()).isEqualTo(201);
		String paymentId = objectMapper.readTree(anonPay.body()).get("id").asText();

		// anonymous capture with the same proof → captured
		HttpResponse<String> anonCapture = post("/api/v1/payments/" + paymentId + "/capture",
				Map.of("guestEmail", guestEmail), null);
		assertThat(anonCapture.statusCode()).isEqualTo(200);
		assertThat(objectMapper.readTree(anonCapture.body()).get("status").asText())
				.isEqualTo("captured");
	}

	@Test
	void reviewRequiresAuthenticatedGuest() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();

		// anonymous → 401
		HttpResponse<String> anon = post("/api/v1/hotels/" + fx.hotelId() + "/reviews",
				Map.of("reservationId", "00000000-0000-0000-0000-000000000000", "rating", 5, "title", "Nice", "comment", "Great stay"),
				null);
		assertThat(anon.statusCode()).isEqualTo(401);

		// authenticated but no completed stay → FORBIDDEN envelope
		HttpResponse<String> registered = post("/api/v1/auth/register",
				Map.of("firstName", "Leo", "lastName", "Guest",
						"email", "leo-" + System.nanoTime() + "@example.com",
						"password", "secret123"),
				null);
		String token = objectMapper.readTree(registered.body()).get("token").asText();
		HttpResponse<String> denied = post("/api/v1/hotels/" + fx.hotelId() + "/reviews",
				Map.of("reservationId", "00000000-0000-0000-0000-000000000000", "rating", 5, "title", "Nice", "comment", "Great stay"),
				token);
		assertThat(denied.statusCode()).isEqualTo(403);
		assertThat(objectMapper.readTree(denied.body()).get("code").asText())
				.isEqualTo("FORBIDDEN");
	}

	/**
	 * Bean validation at the REST edge. {@code spring-boot-starter-validation} was
	 * a declared dependency with a wired {@code MethodArgumentNotValidException}
	 * handler and zero annotations anywhere in the codebase — every check was
	 * hand-rolled inside services. These assert the declarative path now runs,
	 * rejects before any service/inventory work, and reports through the standard
	 * ApiError envelope.
	 */
	@Test
	void malformedBookingIsRejectedByBeanValidationWithTheStandardEnvelope() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		Map<String, Object> guest = Map.of("firstName", "A", "lastName", "B",
				"email", "valid@example.com");

		// no rooms at all
		HttpResponse<String> noRooms = postWithKey("/api/v1/reservations",
				bookingBody(fx, guest, List.of()), "val-norooms-" + System.nanoTime(), null);
		assertThat(noRooms.statusCode()).isEqualTo(400);
		assertThat(objectMapper.readTree(noRooms.body()).get("code").asText())
				.isEqualTo("VALIDATION");

		// adults must be positive
		Map<String, Object> zeroAdults = new java.util.HashMap<>(
				bookingBody(fx, guest, List.of(Map.of("roomTypeId", fx.roomType().getId().toString(),
						"ratePlanId", fx.ratePlan().getId().toString()))));
		zeroAdults.put("adults", 0);
		HttpResponse<String> adults = postWithKey("/api/v1/reservations", zeroAdults,
				"val-adults-" + System.nanoTime(), null);
		assertThat(adults.statusCode()).isEqualTo(400);
		assertThat(objectMapper.readTree(adults.body()).get("code").asText()).isEqualTo("VALIDATION");
	}

	/**
	 * Regression guard: {@code String.valueOf((UUID) null)} yields the string
	 * "null", which is not blank, so the old hand-rolled guard let a null
	 * roomTypeId through to fail later as a confusing lookup miss.
	 */
	@Test
	void nullRoomTypeIdIsRejectedRatherThanStringifiedToTheWordNull() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		Map<String, Object> room = new java.util.HashMap<>();
		room.put("roomTypeId", null);
		room.put("ratePlanId", fx.ratePlan().getId().toString());
		Map<String, Object> body = bookingBody(fx,
				Map.of("firstName", "A", "lastName", "B", "email", "valid@example.com"),
				List.of(room));

		HttpResponse<String> res = postWithKey("/api/v1/reservations", body,
				"val-nullroom-" + System.nanoTime(), null);
		assertThat(res.statusCode()).isEqualTo(400);
		assertThat(objectMapper.readTree(res.body()).get("code").asText()).isEqualTo("VALIDATION");
	}

	private Map<String, Object> bookingBody(TestFixtures.HotelFixture fx,
			Map<String, Object> guest, List<?> rooms) {
		Map<String, Object> body = new java.util.HashMap<>();
		body.put("hotelId", fx.hotelId().toString());
		body.put("checkInDate", LocalDate.now().plusDays(20).toString());
		body.put("checkOutDate", LocalDate.now().plusDays(22).toString());
		body.put("adults", 2);
		body.put("children", 0);
		body.put("currencyCode", "MAD");
		body.put("guest", guest);
		body.put("rooms", rooms);
		return body;
	}
}

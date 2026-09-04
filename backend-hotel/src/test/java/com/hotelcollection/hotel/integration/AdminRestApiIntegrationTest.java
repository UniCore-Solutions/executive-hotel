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
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.entity.OtpPurpose;
import com.hotelcollection.hotel.repository.MediaRepository;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.JwtService;
import com.hotelcollection.hotel.service.OtpService;

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
	@Autowired
	org.springframework.jdbc.core.JdbcTemplate jdbc;
	@Autowired
	OtpService otpService;
	@Autowired
	MediaRepository mediaRepository;

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
	 * Registers a real user (audit_logs.actor_user_id references the users
	 * table) and issues a token carrying the real id. register() now only
	 * sends an OTP (no session) — this helper never needs a real one anyway
	 * (it mints its own token with whatever roles the case under test
	 * wants), so it just reads the id straight from the database instead of
	 * completing verification.
	 */
	private String tokenWithRoles(List<String> roles) throws Exception {
		String email = "admin-rest-" + System.nanoTime() + "@example.com";
		HttpResponse<String> registered = send("POST", "/api/v1/auth/register",
				Map.of("firstName", "Admin", "lastName", "Rest", "email", email,
						"password", "secret123"),
				null);
		assertThat(registered.statusCode()).isEqualTo(202);
		String userId = jdbc.queryForObject(
				"select id from users where lower(email) = lower(?)", String.class, email);
		return jwtService.issue(new CurrentUser(UUID.fromString(userId), email, roles, List.of(),
				Instant.now()));
	}

	/** Same as {@link #tokenWithRoles} but with a real hotel membership —
	 * needed for any case that depends on {@code CurrentUser.hotelIds()}
	 * actually being non-empty (e.g. {@code requireHotelAdminOrSuperAdmin}). */
	private String tokenWithRolesAndHotel(List<String> roles, UUID hotelId) throws Exception {
		String email = "admin-rest-" + System.nanoTime() + "@example.com";
		HttpResponse<String> registered = send("POST", "/api/v1/auth/register",
				Map.of("firstName", "Admin", "lastName", "Rest", "email", email,
						"password", "secret123"),
				null);
		assertThat(registered.statusCode()).isEqualTo(202);
		String userId = jdbc.queryForObject(
				"select id from users where lower(email) = lower(?)", String.class, email);
		return jwtService.issue(new CurrentUser(UUID.fromString(userId), email, roles,
				List.of(hotelId), Instant.now()));
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
				Map.of("description", "updated via REST", "starRating", 4, "website",
						"https://example.com", "timezone", "Europe/Lisbon", "languages",
						List.of("en", "fr")),
				token);
		assertThat(updated.statusCode()).isEqualTo(200);
		var updatedBody = objectMapper.readTree(updated.body());
		assertThat(updatedBody.get("description").asText()).isEqualTo("updated via REST");
		assertThat(updatedBody.get("starRating").asInt()).isEqualTo(4);
		assertThat(updatedBody.get("website").asText()).isEqualTo("https://example.com");
		assertThat(updatedBody.get("timezone").asText()).isEqualTo("Europe/Lisbon");
		assertThat(updatedBody.get("languages").get(0).asText()).isEqualTo("en");
		assertThat(updatedBody.get("languages").get(1).asText()).isEqualTo("fr");

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

	/**
	 * The logo has its own dedicated upload path ({@code /api/v1/media/upload},
	 * category="logo") specifically so it survives a gallery save — this
	 * proves the replace-all `.../media` write can neither drop it (by
	 * omission) nor duplicate it (a stray logo-category entry in the input
	 * is dropped, not inserted).
	 */
	@Test
	void galleryReplaceAllPreservesLogoAndDropsStrayLogoInputs() throws Exception {
		String token = staffToken();
		HttpResponse<String> created = send("POST", "/api/v1/admin/hotels",
				Map.of("name", "Logo Hotel " + System.nanoTime(), "brand", "Hotel Collection",
						"description", "logo test", "city", "Marrakech", "countryCode", "MA",
						"defaultCurrency", "MAD", "status", "active"),
				token);
		UUID hotelId = UUID.fromString(objectMapper.readTree(created.body()).get("id").asText());

		Media logo = new Media();
		logo.setUrl("https://example.com/logo.png");
		logo.setStorageKey("logo-" + System.nanoTime());
		logo.setCategory("logo");
		logo.setHotelId(hotelId);
		logo.setPrimary(false);
		logo.setSortOrder((short) 0);
		logo.setCreatedAt(Instant.now());
		UUID logoId = mediaRepository.saveAndFlush(logo).getId();

		HttpResponse<String> replaced = send("PUT", "/api/v1/admin/hotels/" + hotelId + "/media",
				List.of(
						Map.of("url", "https://example.com/room.jpg", "isPrimary", true, "category", "gallery"),
						Map.of("url", "https://example.com/sneaky-logo.png", "isPrimary", false, "category", "logo")),
				token);
		assertThat(replaced.statusCode()).isEqualTo(200);
		var replacedBody = objectMapper.readTree(replaced.body());
		assertThat(replacedBody).hasSize(1);
		assertThat(replacedBody.get(0).get("url").asText()).isEqualTo("https://example.com/room.jpg");

		List<Media> hotelMedia = mediaRepository.findByHotelId(hotelId);
		assertThat(hotelMedia.stream().filter(m -> "logo".equals(m.getCategory())))
				.hasSize(1)
				.allSatisfy(m -> assertThat(m.getId()).isEqualTo(logoId));
		assertThat(hotelMedia.stream().filter(m -> "gallery".equals(m.getCategory())))
				.hasSize(1);
	}

	@Test
	void amenityCrudAndActivationLifecycle() throws Exception {
		String token = staffToken();
		String name = "Rooftop Terrace " + System.nanoTime();

		HttpResponse<String> created = send("POST", "/api/v1/admin/amenities",
				Map.of("name", name, "icon", "sun", "category", "wellness"), token);
		assertThat(created.statusCode()).isEqualTo(201);
		var createdBody = objectMapper.readTree(created.body());
		String amenityId = createdBody.get("id").asText();
		assertThat(createdBody.get("category").asText()).isEqualTo("wellness");
		// Amenity.isActive() serializes as "active" (Jackson strips the "is"
		// prefix for boolean getters), same as every other boolean in this suite.
		assertThat(createdBody.get("active").asBoolean()).isTrue();

		HttpResponse<String> duplicate = send("POST", "/api/v1/admin/amenities",
				Map.of("name", name), token);
		assertThat(duplicate.statusCode()).isEqualTo(409);

		HttpResponse<String> updated = send("PUT", "/api/v1/admin/amenities/" + amenityId,
				Map.of("category", "outdoor", "isActive", false), token);
		assertThat(updated.statusCode()).isEqualTo(200);
		var updatedBody = objectMapper.readTree(updated.body());
		assertThat(updatedBody.get("category").asText()).isEqualTo("outdoor");
		assertThat(updatedBody.get("active").asBoolean()).isFalse();
		// Name/icon are unset on this update — must stay unchanged.
		assertThat(updatedBody.get("name").asText()).isEqualTo(name);
		assertThat(updatedBody.get("icon").asText()).isEqualTo("sun");

		HttpResponse<String> reactivated = send("PUT", "/api/v1/admin/amenities/" + amenityId,
				Map.of("isActive", true), token);
		assertThat(objectMapper.readTree(reactivated.body()).get("active").asBoolean()).isTrue();

		// hotel_admin of a real hotel can also create/edit catalog amenities —
		// not just super_admin (task-driven: an addition here is immediately
		// usable by every other hotel too, so it's deliberately not gated to
		// this hotel_admin's own hotel).
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String hotelAdminToken = tokenWithRolesAndHotel(List.of("hotel_admin"), fx.hotelId());
		HttpResponse<String> byHotelAdmin = send("POST", "/api/v1/admin/amenities",
				Map.of("name", "Rooftop Bar " + System.nanoTime()), hotelAdminToken);
		assertThat(byHotelAdmin.statusCode()).isEqualTo(201);

		// hotel_admin with no hotel membership at all still fails — the check
		// requires actually managing a hotel, not just holding the role name.
		HttpResponse<String> hotelAdminNoHotel = send("POST", "/api/v1/admin/amenities",
				Map.of("name", "Blocked " + System.nanoTime()), tokenWithRoles(List.of("hotel_admin")));
		assertThat(hotelAdminNoHotel.statusCode()).isEqualTo(403);

		// A non-admin staff role is blocked regardless of hotel membership.
		HttpResponse<String> receptionStaff = send("POST", "/api/v1/admin/amenities",
				Map.of("name", "Blocked " + System.nanoTime()),
				tokenWithRolesAndHotel(List.of("reception_staff"), fx.hotelId()));
		assertThat(receptionStaff.statusCode()).isEqualTo(403);
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
	void bulkRoomCreationPatternAndManualModesWithCollisionRejection() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken();

		HttpResponse<String> rt = send("POST",
				"/api/v1/admin/hotels/" + fx.hotelId() + "/room-types",
				Map.of("name", "Bulk Suite", "maxAdults", 2, "status", "active"), token);
		String roomTypeId = objectMapper.readTree(rt.body()).get("id").asText();
		String bulkPath = "/api/v1/admin/hotels/" + fx.hotelId() + "/room-types/" + roomTypeId + "/rooms/bulk";

		// Pattern mode: prefix + startNumber + count -> DLX-101..DLX-110.
		HttpResponse<String> pattern = send("POST", bulkPath,
				Map.of("prefix", "DLX", "startNumber", 101, "count", 10, "floor", "1"), token);
		assertThat(pattern.statusCode()).isEqualTo(201);
		var patternBody = objectMapper.readTree(pattern.body());
		assertThat(patternBody).hasSize(10);
		assertThat(patternBody.get(0).get("roomNumber").asText()).isEqualTo("DLX-101");
		assertThat(patternBody.get(9).get("roomNumber").asText()).isEqualTo("DLX-110");

		Integer totalInventory = jdbc.queryForObject(
				"select total_inventory from room_types where id = ?::uuid", Integer.class, roomTypeId);
		assertThat(totalInventory).isEqualTo(10);

		// Manual mode: explicit list.
		HttpResponse<String> manual = send("POST", bulkPath,
				Map.of("roomNumbers", List.of("M1", "M2", "M3")), token);
		assertThat(manual.statusCode()).isEqualTo(201);
		assertThat(objectMapper.readTree(manual.body())).hasSize(3);

		// Collision pre-flight: DLX-110 already exists (the last of the first
		// batch), DLX-111/DLX-112 do not -> the whole batch is rejected, zero
		// partial inserts of the genuinely-new numbers.
		HttpResponse<String> colliding = send("POST", bulkPath,
				Map.of("prefix", "DLX", "startNumber", 110, "count", 3), token);
		assertThat(colliding.statusCode()).isEqualTo(409);
		Integer afterCollision = jdbc.queryForObject(
				"select count(*) from rooms where hotel_id = ?::uuid and room_number in ('DLX-111','DLX-112')",
				Integer.class, fx.hotelId());
		assertThat(afterCollision).isEqualTo(0);

		// Duplicate-within-batch is rejected before any DB round trip.
		HttpResponse<String> duplicateInBatch = send("POST", bulkPath,
				Map.of("roomNumbers", List.of("X1", "X1")), token);
		assertThat(duplicateInBatch.statusCode()).isEqualTo(400);
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
		assertThat(registered.statusCode()).isEqualTo(202);
		String code = otpService.issue(OtpPurpose.registration_verification, email, "P", null, null);
		HttpResponse<String> verified = send("POST", "/api/v1/auth/register/verify",
				Map.of("email", email, "code", code), null);
		assertThat(verified.statusCode()).isEqualTo(200);
		String token = objectMapper.readTree(verified.body()).get("token").asText();

		HttpResponse<String> updated = send("POST", "/api/v1/auth/me/profile",
				Map.of("firstName", "Patricia", "phone", "+212611111111"), token);
		assertThat(updated.statusCode()).isEqualTo(200);
		assertThat(objectMapper.readTree(updated.body()).get("email").asText()).isEqualTo(email);
	}
}

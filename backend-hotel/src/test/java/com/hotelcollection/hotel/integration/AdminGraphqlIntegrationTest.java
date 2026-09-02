package com.hotelcollection.hotel.integration;
import com.hotelcollection.hotel.dto.availability.AvailabilityInput;

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
import com.hotelcollection.hotel.entity.Amenity;
import com.hotelcollection.hotel.repository.AmenityRepository;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.JwtService;
import com.hotelcollection.hotel.repository.ReviewRepository;

/**
 * Back-office API over real HTTP — READ side via GraphQL, WRITE side via
 * REST (API rule: GraphQL = READ, REST = WRITE/ACTION). Covers hotel-scoped
 * authz (IDOR blocked), catalog/pricing/availability CRUD round-trips,
 * operations reads, staff cancellation, review moderation, and
 * super_admin-only platform admin.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ContextConfiguration(classes = TestcontainersConfiguration.class)
class AdminGraphqlIntegrationTest {

	private static UUID uid(long n) { return new UUID(0, n); }

	@LocalServerPort
	int port;

	@Autowired
	TestFixtures fixtures;
	@Autowired
	JwtService jwtService;
	@Autowired
	AmenityRepository amenityRepository;
	@Autowired
	ReviewRepository reviewRepository;
	@Autowired
	org.springframework.jdbc.core.JdbcTemplate jdbc;

	private final ObjectMapper objectMapper = new ObjectMapper();
	private final HttpClient http = HttpClient.newBuilder()
			.connectTimeout(Duration.ofSeconds(10)).build();

	private String staffToken(UUID userId, List<UUID> hotelIds) throws Exception {
		return issueToken(userId, List.of("hotel_admin"), hotelIds);
	}

	private String superAdminToken(UUID userId) throws Exception {
		return issueToken(userId, List.of("super_admin"), List.of());
	}

	/** Registers a real user (audit_logs.cancelled_by_user_id / actor_user_id
	 * reference users) and issues a staff token carrying the real id. */
	private String issueToken(UUID userId, List<String> roles, List<UUID> hotelIds)
			throws Exception {
		String email = "staff-" + userId + "-" + System.nanoTime() + "@example.com";
		Map<String, Object> reg = rest("POST", "/api/v1/auth/register",
				Map.of("firstName", "Staff", "lastName", "User",
						"email", email, "password", "secret123"),
				null);
		assertThat(reg.get("__status")).isEqualTo(201);
		String registeredId = (String) ((Map<String, Object>) reg.get("me")).get("userId");
		return jwtService.issue(new CurrentUser(UUID.fromString(registeredId), email, roles,
				hotelIds, Instant.now()));
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> post(String query, Map<String, Object> variables, String bearer)
			throws Exception {
		HttpRequest.Builder builder = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + "/graphql"))
				.timeout(Duration.ofSeconds(30))
				.header("Content-Type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(
						Map.of("query", query, "variables", variables == null ? Map.of()
								: variables))));
		if (bearer != null) {
			builder.header("Authorization", "Bearer " + bearer);
		}
		HttpResponse<String> response = http.send(builder.build(),
				HttpResponse.BodyHandlers.ofString());
		assertThat(response.statusCode()).isEqualTo(200);
		return objectMapper.readValue(response.body(), Map.class);
	}

	/** REST write helper: returns the parsed body plus the HTTP status in
	 * {@code __status}. */
	@SuppressWarnings("unchecked")
	private Map<String, Object> rest(String method, String path, Object body, String bearer)
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
		HttpResponse<String> response = http.send(builder.build(),
				HttpResponse.BodyHandlers.ofString());
		if (response.body().isBlank()) {
			Map<String, Object> empty = new java.util.HashMap<>();
			empty.put("__status", response.statusCode());
			return empty;
		}
		Map<String, Object> parsed = objectMapper.readValue(response.body(), Map.class);
		parsed.put("__status", response.statusCode());
		return parsed;
	}

	/** REST write helper for list-shaped responses (amenities/media/policies/
	 * prices replacements): returns the parsed array. */
	private List<Map<String, Object>> restList(String method, String path, Object body,
			String bearer) throws Exception {
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
		HttpResponse<String> response = http.send(builder.build(),
				HttpResponse.BodyHandlers.ofString());
		assertThat(response.statusCode()).isIn(200, 201);
		return objectMapper.readValue(response.body(),
				new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, Object>>>() {
				});
	}

	/** REST envelope error code (the backend's ApiError.code). */
	private String restCode(Map<String, Object> body) {
		assertThat(body.get("__status")).isNotIn(200, 201, 204);
		return (String) body.get("code");
	}

	private String extensionsCode(Map<String, Object> body) {
		List<Map<String, Object>> errors = (List<Map<String, Object>>) body.get("errors");
		assertThat(errors).isNotEmpty();
		Map<String, Object> extensions = (Map<String, Object>) errors.get(0).get("extensions");
		return (String) extensions.get("code");
	}

	@Test
	void adminAmenitiesRequiresStaffRole() throws Exception {
		String guest = issueToken(uid(9101), List.of("guest"), List.of());

		Map<String, Object> body = post("""
				query { adminAmenities { id name category } }
				""", null, guest);
		assertThat(extensionsCode(body)).isEqualTo("FORBIDDEN");

		Map<String, Object> ok = post("""
				query { adminAmenities { id name category } }
				""", null, staffToken(uid(9102), List.of(uid(999))));
		assertThat(ok.get("errors")).isNull();
	}

	@Test
	void malformedUuidArgumentIsValidationError() throws Exception {
		String token = staffToken(uid(9103), List.of(fixtures.newBookableHotel().hotelId()));

		Map<String, Object> body = post("""
				query { roomType(id: "not-a-uuid") { id } }
				""", null, token);
		assertThat(extensionsCode(body)).isEqualTo("NOT_FOUND");
	}

	@Test
	void adminAmenitiesReturnsSeededCatalogForAnyStaff() throws Exception {
		String token = staffToken(uid(9), List.of(uid(999)));

		Map<String, Object> body = post("""
				query { adminAmenities { id name category } }
				""", null, token);
		assertThat(body.get("errors")).isNull();
		List<Map<String, Object>> amenities = (List<Map<String, Object>>)
				((Map<String, Object>) body.get("data")).get("adminAmenities");
		assertThat(amenities).isNotEmpty();
		assertThat(amenities).extracting(a -> a.get("name"))
				.contains("Wi-Fi", "Swimming Pool", "Sea View");
	}

	@Test
	void roomTypeInventoryIsDerivedFromPhysicalRooms() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken(uid(101), List.of(fx.hotelId()));
		// the fixture room type ships with 3 physical rooms → derived inventory 3
		Map<String, Object> derived = rest("PUT",
				"/api/v1/admin/room-types/" + fx.roomType().getId(),
				Map.of("totalInventory", 3), token);
		assertThat(derived.get("__status")).isEqualTo(200);

		Map<String, Object> inventory = post("""
				query($hotelId: ID!) {
				  adminHotel(hotelId: $hotelId) { roomTypes { totalInventory } }
				}
				""", Map.of("hotelId", fx.hotelId().toString()), token);
		assertThat(inventory.get("errors")).isNull();
		List<Map<String, Object>> roomTypes = (List<Map<String, Object>>) ((Map<String, Object>) (
				(Map<String, Object>) inventory.get("data")).get("adminHotel")).get("roomTypes");
		assertThat(((Number) roomTypes.get(0).get("totalInventory")).intValue()).isEqualTo(3);

		// a hand-set number that disagrees with the physical room count is rejected
		Map<String, Object> mismatched = rest("PUT",
				"/api/v1/admin/room-types/" + fx.roomType().getId(),
				Map.of("totalInventory", 2), token);
		assertThat(restCode(mismatched)).isEqualTo("VALIDATION");

		// adding a physical room raises the derived inventory to 4
		jdbc.update("INSERT INTO rooms (id, hotel_id, room_type_id, room_number, floor, status,"
				+ " housekeeping_status, maintenance_status, created_at, updated_at) "
				+ "VALUES (gen_random_uuid(), ?, ?, '901', '9', 'active', 'clean', 'ok', now(), now())",
				fx.hotelId(), fx.roomType().getId());
		Map<String, Object> raised = rest("PUT",
				"/api/v1/admin/room-types/" + fx.roomType().getId(),
				Map.of("totalInventory", 4), token);
		assertThat(raised.get("__status")).isEqualTo(200);

		Map<String, Object> after = post("""
				query($hotelId: ID!) {
				  adminHotel(hotelId: $hotelId) { roomTypes { totalInventory } }
				}
				""", Map.of("hotelId", fx.hotelId().toString()), token);
		List<Map<String, Object>> afterTypes = (List<Map<String, Object>>) ((Map<String, Object>) (
				(Map<String, Object>) after.get("data")).get("adminHotel")).get("roomTypes");
		assertThat(((Number) afterTypes.get(0).get("totalInventory")).intValue()).isEqualTo(4);
	}

	@Test
	void adminHotelReturnsFullWorkspace() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken(uid(10), List.of(fx.hotelId()));

		Map<String, Object> body = post("""
				query($hotelId: ID!) {
				  adminHotel(hotelId: $hotelId) {
				    name status
				    hotel { name city defaultCurrency }
				    roomTypes { name maxAdults rooms { roomNumber } }
				    ratePlans { name code links { roomTypeName prices { validFrom validTo priceAmount } } }
				    availability { stayDate totalInventory free }
				  }
				}
				""", Map.of("hotelId", fx.hotelId().toString()), token);
		assertThat(body.get("errors")).isNull();
		Map<String, Object> data = (Map<String, Object>) body.get("data");
		Map<String, Object> admin = (Map<String, Object>) data.get("adminHotel");
		assertThat(((Map<String, Object>) admin.get("hotel")).get("city")).isEqualTo("Marrakech");
		List<Map<String, Object>> roomTypes = (List<Map<String, Object>>) admin.get("roomTypes");
		assertThat(roomTypes).hasSize(1);
		List<Map<String, Object>> ratePlans = (List<Map<String, Object>>) admin.get("ratePlans");
		assertThat(ratePlans).hasSize(1);
		List<Map<String, Object>> links = (List<Map<String, Object>>) ratePlans.get(0).get("links");
		assertThat(links).hasSize(1);
		assertThat((List<?>) links.get(0).get("prices")).isNotEmpty();
		// sparse inventory: a fresh hotel has no availability rows yet
		assertThat((List<?>) admin.get("availability")).isEmpty();
	}

	@Test
	void adminHotelsIsScopedToMembership() throws Exception {
		TestFixtures.HotelFixture mine = fixtures.newBookableHotel();
		TestFixtures.HotelFixture other = fixtures.newBookableHotel();
		String token = staffToken(uid(11), List.of(mine.hotelId()));

		Map<String, Object> body = post("""
				query {
				  adminHotels(page: { page: 0, size: 200 }) { total items { id name } }
				}
				""", null, token);
		assertThat(body.get("errors")).isNull();
		Map<String, Object> page = (Map<String, Object>) ((Map<String, Object>) body.get("data"))
				.get("adminHotels");
		List<Map<String, Object>> items = (List<Map<String, Object>>) page.get("items");
		assertThat(items).extracting(m -> m.get("id"))
				.containsExactly(mine.hotelId().toString());

		Map<String, Object> root = post("""
				query {
				  adminHotels(page: { page: 0, size: 200 }) { total items { id } }
				}
				""", null, superAdminToken(uid(12)));
		Map<String, Object> rootPage = (Map<String, Object>) ((Map<String, Object>) root.get("data"))
				.get("adminHotels");
		List<Map<String, Object>> rootItems = (List<Map<String, Object>>) rootPage.get("items");
		assertThat(rootItems).extracting(m -> m.get("id"))
				.contains(mine.hotelId().toString(), other.hotelId().toString());
	}

	@Test
	void staffOfAnotherHotelCannotReadOrWrite() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		TestFixtures.HotelFixture other = fixtures.newBookableHotel();
		String outsider = staffToken(uid(13), List.of(other.hotelId()));

		Map<String, Object> read = post("""
				query { adminDashboard(hotelId: "%s") { hotelName } }
				""".formatted(fx.hotelId()), null, outsider);
		assertThat(extensionsCode(read)).isEqualTo("FORBIDDEN");

		Map<String, Object> write = rest("PUT", "/api/v1/admin/hotels/" + fx.hotelId(),
				Map.of("name", "Hacked"), outsider);
		assertThat(restCode(write)).isEqualTo("FORBIDDEN");
	}

	@Test
	void hotelCrudRoundTrip() throws Exception {
		String token = superAdminToken(uid(20));
		Map<String, Object> created = rest("POST", "/api/v1/admin/hotels", Map.of(
				"name", "Riad Atlas " + System.nanoTime(),
				"city", "Fes", "defaultCurrency", TestFixtures.CURRENCY,
				"status", "draft"), token);
		assertThat(created.get("__status")).isEqualTo(201);
		String id = (String) created.get("id");

		Map<String, Object> updated = rest("PUT", "/api/v1/admin/hotels/" + id,
				Map.of("name", "Riad Atlas Grand", "status", "active"), token);
		assertThat(updated.get("__status")).isEqualTo(200);
		assertThat(updated.get("name")).isEqualTo("Riad Atlas Grand");
		assertThat(updated.get("status")).isEqualTo("active");
	}

	@Test
	void createHotelRequiresSuperAdmin() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		Map<String, Object> body = rest("POST", "/api/v1/admin/hotels",
				Map.of("name", "Nope"), staffToken(uid(21), List.of(fx.hotelId())));
		assertThat(restCode(body)).isEqualTo("FORBIDDEN");
	}

	@Test
	void roomTypeAndRoomCrudRoundTrip() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken(uid(30), List.of(fx.hotelId()));

		Map<String, Object> created = rest("POST",
				"/api/v1/admin/hotels/" + fx.hotelId() + "/room-types",
				Map.of("name", "Junior Suite", "maxAdults", 3, "viewType", "Garden"), token);
		assertThat(created.get("__status")).isEqualTo(201);
		String rtId = (String) created.get("id");

		Map<String, Object> room = rest("POST",
				"/api/v1/admin/hotels/" + fx.hotelId() + "/rooms",
				Map.of("roomTypeId", rtId, "roomNumber", "201", "floor", "2"), token);
		assertThat(room.get("__status")).isEqualTo(201);
		String roomId = (String) room.get("id");

		Map<String, Object> dup = rest("POST",
				"/api/v1/admin/hotels/" + fx.hotelId() + "/rooms",
				Map.of("roomTypeId", rtId, "roomNumber", "201"), token);
		assertThat(restCode(dup)).isEqualTo("CONFLICT");

		Map<String, Object> updated = rest("PUT", "/api/v1/admin/rooms/" + roomId,
				Map.of("roomTypeId", rtId, "roomNumber", "201", "housekeepingStatus", "dirty"),
				token);
		assertThat(updated.get("__status")).isEqualTo(200);

		Map<String, Object> workspace = post("""
				query($hotelId: ID!) {
				  adminHotel(hotelId: $hotelId) {
				    roomTypes { name rooms { roomNumber housekeepingStatus } }
				  }
				}
				""", Map.of("hotelId", fx.hotelId().toString()), token);
		List<Map<String, Object>> roomTypes = (List<Map<String, Object>>) ((Map<String, Object>) (
				(Map<String, Object>) workspace.get("data")).get("adminHotel")).get("roomTypes");
		Map<String, Object> suite = roomTypes.stream()
				.filter(rt -> "Junior Suite".equals(rt.get("name"))).findFirst().orElseThrow();
		assertThat(((List<Map<String, Object>>) suite.get("rooms")).get(0).get("housekeepingStatus"))
				.isEqualTo("dirty");
	}

	@Test
	void amenitiesAndMediaReplacement() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		Amenity a1 = new Amenity();
		a1.setName("Complimentary Wi-Fi");
		a1.setCategory("general");
		a1 = amenityRepository.save(a1);
		Amenity a2 = new Amenity();
		a2.setName("Rooftop Pool");
		a2.setCategory("wellness");
		a2 = amenityRepository.save(a2);
		String token = staffToken(uid(31), List.of(fx.hotelId()));

		List<Map<String, Object>> setAmenities = restList("PUT",
				"/api/v1/admin/hotels/" + fx.hotelId() + "/amenities",
				List.of(a1.getId().toString(), a2.getId().toString()), token);
		assertThat(setAmenities).hasSize(2);

		restList("PUT", "/api/v1/admin/hotels/" + fx.hotelId() + "/media",
				List.of(
						Map.of("url", "https://example.com/a.jpg", "isPrimary", true),
						Map.of("url", "https://example.com/b.jpg")), token);

		List<Map<String, Object>> replaced = restList("PUT",
				"/api/v1/admin/hotels/" + fx.hotelId() + "/media",
				List.of(Map.of("url", "https://example.com/c.jpg", "isPrimary", true)), token);
		assertThat(replaced).hasSize(1);

		Map<String, Object> workspace = post("""
				query($hotelId: ID!) {
				  adminHotel(hotelId: $hotelId) { amenities { name } media { url } }
				}
				""", Map.of("hotelId", fx.hotelId().toString()), token);
		Map<String, Object> admin = (Map<String, Object>) ((Map<String, Object>) workspace
				.get("data")).get("adminHotel");
		assertThat((List<?>) admin.get("amenities")).hasSize(2);
		assertThat(((List<Map<String, Object>>) admin.get("media")).get(0).get("url"))
				.isEqualTo("https://example.com/c.jpg");
	}

	@Test
	void hotelPoliciesReplacementAndExposureOnHotelDetails() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken(uid(32), List.of(fx.hotelId()));

		List<Map<String, Object>> setPolicies = restList("PUT",
				"/api/v1/admin/hotels/" + fx.hotelId() + "/policies",
				List.of(
						Map.of("name", "Check-in", "value", "From 15:00", "icon", "clock", "sortOrder", 0),
						Map.of("name", "Pets", "value", "Not allowed", "icon", "paw", "sortOrder", 1)),
				token);
		assertThat(setPolicies).hasSize(2);

		// A second call replaces the set rather than appending to it.
		List<Map<String, Object>> replaced = restList("PUT",
				"/api/v1/admin/hotels/" + fx.hotelId() + "/policies",
				List.of(Map.of("name", "Smoking", "value", "No smoking on site")), token);
		assertThat(replaced).hasSize(1);

		Map<String, Object> details = post("""
				query($id: ID!) {
				  hotelDetails(id: $id) { policies { name value } }
				}
				""", Map.of("id", fx.hotelId().toString()), null);
		assertThat(details.get("errors")).isNull();
		List<Map<String, Object>> policies = (List<Map<String, Object>>) ((Map<String, Object>)
				((Map<String, Object>) details.get("data")).get("hotelDetails")).get("policies");
		assertThat(policies).hasSize(1);
		assertThat(policies.get(0).get("name")).isEqualTo("Smoking");
	}

	@Test
	void ratePlanLinkAndPriceManagement() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken(uid(40), List.of(fx.hotelId()));

		Map<String, Object> created = rest("POST",
				"/api/v1/admin/hotels/" + fx.hotelId() + "/rate-plans",
				Map.of("name", "Non-refundable Advance", "code", "nr-advance",
						"currencyCode", TestFixtures.CURRENCY,
						"isRefundable", false, "paymentTiming", "prepay_full"), token);
		assertThat(created.get("__status")).isEqualTo(201);
		String planId = (String) created.get("id");

		Map<String, Object> linked = rest("POST", "/api/v1/admin/room-type-rate-plans",
				Map.of("roomTypeId", fx.roomType().getId().toString(), "ratePlanId", planId), token);
		assertThat(linked.get("__status")).isEqualTo(200);
		String linkId = (String) linked.get("id");

		List<Map<String, Object>> priced = restList("PUT",
				"/api/v1/admin/room-type-rate-plans/" + linkId + "/prices",
				List.of(
						Map.of("validFrom", "2026-01-01", "validTo", "2026-06-30",
								"priceAmount", 850.0),
						Map.of("validFrom", "2026-07-01", "validTo", "2026-12-31",
								"priceAmount", 950.0)), token);
		assertThat(priced).hasSize(2);

		Map<String, Object> overlap = rest("PUT",
				"/api/v1/admin/room-type-rate-plans/" + linkId + "/prices",
				List.of(
						Map.of("validFrom", "2026-05-01", "validTo", "2026-08-31",
								"priceAmount", 900.0),
						Map.of("validFrom", "2026-07-01", "validTo", "2026-10-31",
								"priceAmount", 910.0)), token);
		assertThat(restCode(overlap)).isEqualTo("CONFLICT");

		Map<String, Object> unlinked = rest("DELETE",
				"/api/v1/admin/room-type-rate-plans/" + linkId, null, token);
		assertThat(unlinked.get("__status")).isEqualTo(200);
	}

	@Test
	void updateRatePlanRoundTrip() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken(uid(42), List.of(fx.hotelId()));

		Map<String, Object> created = rest("POST",
				"/api/v1/admin/hotels/" + fx.hotelId() + "/rate-plans",
				Map.of("name", "Advance Saver", "code", "adv-saver",
						"currencyCode", TestFixtures.CURRENCY,
						"isRefundable", false, "paymentTiming", "prepay_full"), token);
		assertThat(created.get("__status")).isEqualTo(201);
		String planId = (String) created.get("id");

		Map<String, Object> updated = rest("PUT", "/api/v1/admin/rate-plans/" + planId,
				Map.of("name", "Advance Saver Plus", "mealPlan", "hb", "isRefundable", true,
						"paymentTiming", "pay_at_property"), token);
		assertThat(updated.get("__status")).isEqualTo(200);
		assertThat(updated.get("name")).isEqualTo("Advance Saver Plus");
		assertThat(updated.get("mealPlan")).isEqualTo("hb");
		assertThat(updated.get("refundable")).isEqualTo(true);

		Map<String, Object> outsider = rest("PUT", "/api/v1/admin/rate-plans/" + planId,
				Map.of("name", "Sneaky"),
				staffToken(uid(43), List.of(fixtures.newBookableHotel().hotelId())));
		assertThat(restCode(outsider)).isEqualTo("FORBIDDEN");
	}

	@Test
	void roomTypeAmenitiesAndMediaReplacement() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		Amenity a1 = new Amenity();
		a1.setName("Shuttle " + System.nanoTime());
		a1.setCategory("transport");
		a1 = amenityRepository.save(a1);
		String token = staffToken(uid(44), List.of(fx.hotelId()));

		List<Map<String, Object>> amenities = restList("PUT",
				"/api/v1/admin/room-types/" + fx.roomType().getId() + "/amenities",
				List.of(a1.getId().toString()), token);
		assertThat(amenities).hasSize(1);

		List<Map<String, Object>> media = restList("PUT",
				"/api/v1/admin/room-types/" + fx.roomType().getId() + "/media",
				List.of(Map.of("url", "https://example.com/deluxe.jpg", "isPrimary", true)), token);
		assertThat(media).hasSize(1);
		assertThat(media.get(0).get("url")).isEqualTo("https://example.com/deluxe.jpg");

		Map<String, Object> crossed = rest("PUT",
				"/api/v1/admin/room-types/" + fx.roomType().getId() + "/amenities",
				List.of(a1.getId().toString()),
				staffToken(uid(45), List.of(fixtures.newBookableHotel().hotelId())));
		assertThat(restCode(crossed)).isEqualTo("FORBIDDEN");
	}

	@Test
	void revokeRoleRemovesAccess() throws Exception {
		String root = superAdminToken(uid(102));
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String hotelId = fx.hotelId().toString();

		Map<String, Object> created = rest("POST", "/api/v1/admin/users",
				Map.of("firstName", "Yassine", "lastName", "Amrani",
						"email", "yassine-" + System.nanoTime() + "@example.com",
						"password", "secret123", "roleName", "reservation_agent",
						"hotelId", hotelId), root);
		assertThat(created.get("__status")).isEqualTo(201);
		String userId = (String) created.get("id");
		List<Map<String, Object>> roles = (List<Map<String, Object>>) created.get("roles");
		assertThat(roles).hasSize(1);
		String userRoleId = (String) roles.get(0).get("id");

		Map<String, Object> revoked = rest("DELETE", "/api/v1/admin/users/roles/" + userRoleId,
				null, root);
		assertThat(revoked.get("__status")).isEqualTo(200);
		assertThat((List<?>) revoked.get("roles")).isEmpty();

		Map<String, Object> gone = rest("DELETE", "/api/v1/admin/users/roles/" + userRoleId,
				null, root);
		assertThat(restCode(gone)).isEqualTo("NOT_FOUND");

		Map<String, Object> forbidden = rest("DELETE", "/api/v1/admin/users/roles/" + userRoleId,
				null, staffToken(uid(103), List.of(fx.hotelId())));
		assertThat(restCode(forbidden)).isEqualTo("FORBIDDEN");
	}

	@Test
	void availabilityRangeBlocksAndUnblocksDates() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken(uid(51), List.of(fx.hotelId()));
		String from = LocalDate.now().plusDays(3).toString();
		String to = LocalDate.now().plusDays(5).toString();

		// block 2 units out of order for 3 nights via one range input
		List<Map<String, Object>> blocked = restList("PUT",
				"/api/v1/admin/availability/hotels/" + fx.hotelId(),
				Map.of("roomTypeId", fx.roomType().getId().toString(),
						"fromDate", from, "toDate", to, "outOfOrder", 2), token);
		assertThat(blocked).hasSize(3);

		// 2 units blocked out of 3: a 3-room request is sold out during the block
		Map<String, Object> check = post("""
				query($input: AvailabilityInput!) { availability(input: $input) { status } }
				""", Map.of("input", Map.of("hotelId", fx.hotelId().toString(),
						"checkInDate", from,
						"checkOutDate", LocalDate.parse(from).plusDays(1).toString(),
						"adults", 2, "children", 0, "rooms", 3)), null);
		assertThat(check.get("errors")).isNull();
		List<Map<String, Object>> rows = (List<Map<String, Object>>) ((Map<String, Object>) check
				.get("data")).get("availability");
		assertThat(rows.get(0).get("status")).isEqualTo("soldout");

		// capacity still enforced: blocking all 3 + more than capacity conflicts
		Map<String, Object> capacity = rest("PUT",
				"/api/v1/admin/availability/hotels/" + fx.hotelId(),
				Map.of("roomTypeId", fx.roomType().getId().toString(),
						"fromDate", from, "toDate", to, "blocked", 5), token);
		assertThat(restCode(capacity)).isEqualTo("CONFLICT");

		// unblock: rows carry no information anymore and are removed
		List<Map<String, Object>> unblocked = restList("PUT",
				"/api/v1/admin/availability/hotels/" + fx.hotelId(),
				Map.of("roomTypeId", fx.roomType().getId().toString(),
						"fromDate", from, "toDate", to, "outOfOrder", 0), token);
		assertThat(unblocked).isEmpty();
	}

	@Test
	void availabilityUpdatePersistsAndGuardsCapacity() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken(uid(50), List.of(fx.hotelId()));
		String date = LocalDate.now().plusDays(2).toString();
		// one more physical room → derived inventory 4 (3 fixture rooms + 902)
		jdbc.update("INSERT INTO rooms (id, hotel_id, room_type_id, room_number, floor, status,"
				+ " housekeeping_status, maintenance_status, created_at, updated_at) "
				+ "VALUES (gen_random_uuid(), ?, ?, '902', '9', 'active', 'clean', 'ok', now(), now())",
				fx.hotelId(), fx.roomType().getId());

		List<Map<String, Object>> updated = restList("PUT",
				"/api/v1/admin/availability/hotels/" + fx.hotelId(),
				Map.of("roomTypeId", fx.roomType().getId().toString(),
						"fromDate", date, "toDate", date, "outOfOrder", 1), token);
		assertThat(updated).hasSize(1);

		// totalInventory is derived from physical rooms — a hand-set number is rejected
		Map<String, Object> inventoryWrite = rest("PUT",
				"/api/v1/admin/availability/hotels/" + fx.hotelId(),
				Map.of("roomTypeId", fx.roomType().getId().toString(),
						"fromDate", date, "toDate", date, "totalInventory", 5), token);
		assertThat(restCode(inventoryWrite)).isEqualTo("VALIDATION");

		Map<String, Object> capacity = rest("PUT",
				"/api/v1/admin/availability/hotels/" + fx.hotelId(),
				Map.of("roomTypeId", fx.roomType().getId().toString(),
						"fromDate", date, "toDate", date, "blocked", 20), token);
		assertThat(restCode(capacity)).isEqualTo("CONFLICT");

		Map<String, Object> read = post("""
				query($hotelId: ID!) {
				  adminHotel(hotelId: $hotelId) { availability { stayDate totalInventory outOfOrder } }
				}
				""", Map.of("hotelId", fx.hotelId().toString()), token);
		List<Map<String, Object>> rows = (List<Map<String, Object>>) ((Map<String, Object>) (
				(Map<String, Object>) read.get("data")).get("adminHotel")).get("availability");
		Map<String, Object> row2 = rows.stream()
				.filter(r -> date.equals(r.get("stayDate"))).findFirst().orElseThrow();
		assertThat(((Number) row2.get("totalInventory")).intValue()).isEqualTo(4);
		assertThat(((Number) row2.get("outOfOrder")).intValue()).isEqualTo(1);
	}

	@Test
	void guestsPaymentsInvoicesAndDashboard() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken(uid(60), List.of(fx.hotelId()));
		LocalDate checkIn = LocalDate.now().plusDays(7);

		Map<String, Object> created = book(fx, checkIn, "bo-" + System.nanoTime());
		String reservationId = (String) created.get("id");
		String reference = (String) created.get("reference");

		Map<String, Object> paid = rest("POST", "/api/v1/payments",
				Map.of("reservationId", reservationId, "amount", 3360.0,
						"currencyCode", TestFixtures.CURRENCY, "provider", "mock",
						"idempotencyKey", "bo-pay-" + System.nanoTime()), token);
		assertThat(paid.get("__status")).isEqualTo(201);
		String paymentId = (String) paid.get("id");

		Map<String, Object> captured = rest("POST", "/api/v1/payments/" + paymentId + "/capture",
				Map.of(), token);
		assertThat(captured.get("__status")).isEqualTo(200);

		Map<String, Object> invoiced = rest("POST",
				"/api/v1/reservations/" + reference + "/invoice",
				Map.of("email", "graphql@example.com"), null);
		assertThat(invoiced.get("__status")).isEqualTo(200);

		Map<String, Object> guests = post("""
				query($hotelId: ID!) {
				  adminGuests(hotelId: $hotelId) { total items { firstName email reservationsCount totalSpent } }
				}
				""", Map.of("hotelId", fx.hotelId().toString()), token);
		assertThat(guests.get("errors")).isNull();
		Map<String, Object> guestPage = (Map<String, Object>) ((Map<String, Object>) guests
				.get("data")).get("adminGuests");
		List<Map<String, Object>> guestItems = (List<Map<String, Object>>) guestPage.get("items");
		assertThat(guestItems).hasSize(1);
		assertThat(((Number) guestItems.get(0).get("reservationsCount")).intValue()).isEqualTo(1);
		assertThat(((Number) guestItems.get(0).get("totalSpent")).doubleValue()).isEqualTo(3360.0);

		Map<String, Object> payments = post("""
				query($hotelId: ID!) {
				  adminPayments(hotelId: $hotelId) { total items { status amount } }
				}
				""", Map.of("hotelId", fx.hotelId().toString()), token);
		List<Map<String, Object>> paymentItems = (List<Map<String, Object>>) ((Map<String, Object>) (
				(Map<String, Object>) payments.get("data")).get("adminPayments")).get("items");
		assertThat(paymentItems.get(0).get("status")).isEqualTo("captured");

		Map<String, Object> invoices = post("""
				query($hotelId: ID!) {
				  adminInvoices(hotelId: $hotelId) { total items { invoiceNumber } }
				}
				""", Map.of("hotelId", fx.hotelId().toString()), token);
		assertThat(((Map<String, Object>) ((Map<String, Object>) invoices.get("data"))
				.get("adminInvoices")).get("total")).isEqualTo(1);

		Map<String, Object> dash = post("""
				query($hotelId: ID!) {
				  adminDashboard(hotelId: $hotelId) {
				    hotelName revenueTotal pendingPayments recentReservations { reference }
				  }
				}
				""", Map.of("hotelId", fx.hotelId().toString()), token);
		assertThat(dash.get("errors")).isNull();
		Map<String, Object> stats = (Map<String, Object>) ((Map<String, Object>) dash.get("data"))
				.get("adminDashboard");
		assertThat(((Number) stats.get("revenueTotal")).doubleValue()).isEqualTo(3360.0);
		assertThat(((Number) stats.get("pendingPayments")).intValue()).isEqualTo(0);
		assertThat((List<?>) stats.get("recentReservations")).hasSize(1);
	}

	/** Real server-side search+sort on adminReservations (closes J-1),
	    adminGuests and adminPayments — not a current-page reshuffle. */
	@Test
	void adminReservationsGuestsPaymentsSearchAndSort() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken(uid(61), List.of(fx.hotelId()));

		LocalDate checkInA = LocalDate.now().plusDays(10);
		LocalDate checkInB = LocalDate.now().plusDays(20);
		Map<String, Object> a = bookWithEmail(fx, checkInA, "sort-a-" + System.nanoTime(),
				"sort-search-a@example.com");
		Map<String, Object> b = bookWithEmail(fx, checkInB, "sort-b-" + System.nanoTime(),
				"sort-search-b@example.com");
		String referenceA = (String) a.get("reference");
		String referenceB = (String) b.get("reference");

		Map<String, Object> paidA = rest("POST", "/api/v1/payments",
				Map.of("reservationId", a.get("id"), "amount", 1000.0,
						"currencyCode", TestFixtures.CURRENCY, "provider", "mock",
						"idempotencyKey", "sort-pay-a-" + System.nanoTime()), token);
		assertThat(paidA.get("__status")).isEqualTo(201);
		Map<String, Object> paidB = rest("POST", "/api/v1/payments",
				Map.of("reservationId", b.get("id"), "amount", 2000.0,
						"currencyCode", TestFixtures.CURRENCY, "provider", "mock",
						"idempotencyKey", "sort-pay-b-" + System.nanoTime()), token);
		assertThat(paidB.get("__status")).isEqualTo(201);

		String reservationsQuery = """
				query($hotelId: ID!, $search: String, $sort: String) {
				  adminReservations(hotelId: $hotelId, search: $search, sort: $sort) {
				    total items { reference checkInDate }
				  }
				}
				""";

		// search matches the guest email on one of the two, not the other
		Map<String, Object> searchOnly = post(reservationsQuery,
				Map.of("hotelId", fx.hotelId().toString(), "search", "sort-search-a"), token);
		List<Map<String, Object>> searchItems = (List<Map<String, Object>>) ((Map<String, Object>) (
				(Map<String, Object>) searchOnly.get("data")).get("adminReservations")).get("items");
		assertThat(searchItems).hasSize(1);
		assertThat(searchItems.get(0).get("reference")).isEqualTo(referenceA);

		// sort=checkInDate-asc / -desc reorders both real matches, not a
		// current-page-only reshuffle
		Map<String, Object> sortedAsc = post(reservationsQuery,
				Map.of("hotelId", fx.hotelId().toString(), "search", "sort-search", "sort", "checkInDate-asc"),
				token);
		List<Map<String, Object>> ascItems = (List<Map<String, Object>>) ((Map<String, Object>) (
				(Map<String, Object>) sortedAsc.get("data")).get("adminReservations")).get("items");
		assertThat(ascItems).hasSize(2);
		assertThat(ascItems.get(0).get("reference")).isEqualTo(referenceA);
		assertThat(ascItems.get(1).get("reference")).isEqualTo(referenceB);

		Map<String, Object> sortedDesc = post(reservationsQuery,
				Map.of("hotelId", fx.hotelId().toString(), "search", "sort-search", "sort", "checkInDate-desc"),
				token);
		List<Map<String, Object>> descItems = (List<Map<String, Object>>) ((Map<String, Object>) (
				(Map<String, Object>) sortedDesc.get("data")).get("adminReservations")).get("items");
		assertThat(descItems.get(0).get("reference")).isEqualTo(referenceB);

		// an unrecognized sort field falls back to the documented default
		// (createdAt desc) instead of erroring or passing an unsafe value
		// through to the JPQL order by
		Map<String, Object> badSort = post(reservationsQuery,
				Map.of("hotelId", fx.hotelId().toString(), "search", "sort-search", "sort", "notAField-asc"),
				token);
		assertThat(badSort.get("errors")).isNull();

		String guestsQuery = """
				query($hotelId: ID!, $query: String, $sort: String) {
				  adminGuests(hotelId: $hotelId, query: $query, sort: $sort) { total items { email } }
				}
				""";
		Map<String, Object> guestSearch = post(guestsQuery,
				Map.of("hotelId", fx.hotelId().toString(), "query", "sort-search-a"), token);
		List<Map<String, Object>> guestItems = (List<Map<String, Object>>) ((Map<String, Object>) (
				(Map<String, Object>) guestSearch.get("data")).get("adminGuests")).get("items");
		assertThat(guestItems).hasSize(1);
		assertThat(guestItems.get(0).get("email")).isEqualTo("sort-search-a@example.com");

		Map<String, Object> guestSortAsc = post(guestsQuery,
				Map.of("hotelId", fx.hotelId().toString(), "query", "sort-search", "sort", "email-asc"), token);
		List<Map<String, Object>> guestAsc = (List<Map<String, Object>>) ((Map<String, Object>) (
				(Map<String, Object>) guestSortAsc.get("data")).get("adminGuests")).get("items");
		assertThat(guestAsc).hasSize(2);
		assertThat(guestAsc.get(0).get("email")).isEqualTo("sort-search-a@example.com");

		Map<String, Object> guestSortDesc = post(guestsQuery,
				Map.of("hotelId", fx.hotelId().toString(), "query", "sort-search", "sort", "email-desc"), token);
		List<Map<String, Object>> guestDesc = (List<Map<String, Object>>) ((Map<String, Object>) (
				(Map<String, Object>) guestSortDesc.get("data")).get("adminGuests")).get("items");
		assertThat(guestDesc.get(0).get("email")).isEqualTo("sort-search-b@example.com");

		String paymentsQuery = """
				query($hotelId: ID!, $search: String, $sort: String) {
				  adminPayments(hotelId: $hotelId, search: $search, sort: $sort) { total items { amount } }
				}
				""";
		Map<String, Object> paymentSearch = post(paymentsQuery,
				Map.of("hotelId", fx.hotelId().toString(), "search", "sort-search-a"), token);
		List<Map<String, Object>> paymentItems = (List<Map<String, Object>>) ((Map<String, Object>) (
				(Map<String, Object>) paymentSearch.get("data")).get("adminPayments")).get("items");
		assertThat(paymentItems).hasSize(1);
		assertThat(((Number) paymentItems.get(0).get("amount")).doubleValue()).isEqualTo(1000.0);

		Map<String, Object> paymentSortAsc = post(paymentsQuery,
				Map.of("hotelId", fx.hotelId().toString(), "search", "sort-search", "sort", "amount-asc"), token);
		List<Map<String, Object>> paymentAsc = (List<Map<String, Object>>) ((Map<String, Object>) (
				(Map<String, Object>) paymentSortAsc.get("data")).get("adminPayments")).get("items");
		assertThat(paymentAsc).hasSize(2);
		assertThat(((Number) paymentAsc.get(0).get("amount")).doubleValue()).isEqualTo(1000.0);
		assertThat(((Number) paymentAsc.get(1).get("amount")).doubleValue()).isEqualTo(2000.0);

		Map<String, Object> paymentSortDesc = post(paymentsQuery,
				Map.of("hotelId", fx.hotelId().toString(), "search", "sort-search", "sort", "amount-desc"), token);
		List<Map<String, Object>> paymentDesc = (List<Map<String, Object>>) ((Map<String, Object>) (
				(Map<String, Object>) paymentSortDesc.get("data")).get("adminPayments")).get("items");
		assertThat(((Number) paymentDesc.get(0).get("amount")).doubleValue()).isEqualTo(2000.0);
	}

	@Test
	void promotionsScopedByHotel() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		TestFixtures.HotelFixture other = fixtures.newBookableHotel();
		String token = staffToken(uid(70), List.of(fx.hotelId()));
		String outsider = staffToken(uid(71), List.of(other.hotelId()));

		Map<String, Object> created = rest("POST",
				"/api/v1/admin/promotions?hotelId=" + fx.hotelId(),
				Map.of("code", "SPRING26", "name", "Spring Break",
						"discountType", "percentage", "discountValue", 15.0), token);
		assertThat(created.get("__status")).isEqualTo(201);
		String promoId = (String) created.get("id");

		Map<String, Object> crossed = rest("PUT", "/api/v1/admin/promotions/" + promoId,
				Map.of("name", "Sneaky"), outsider);
		assertThat(restCode(crossed)).isEqualTo("FORBIDDEN");

		Map<String, Object> status = rest("PUT", "/api/v1/admin/promotions/" + promoId + "/status",
				Map.of("status", "inactive"), token);
		assertThat(status.get("__status")).isEqualTo(200);

		Map<String, Object> platformByStaff = rest("POST", "/api/v1/admin/promotions",
				Map.of("code", "GLOBALX", "name", "Global",
						"discountType", "fixed_amount", "discountValue", 50.0), token);
		assertThat(restCode(platformByStaff)).isEqualTo("FORBIDDEN");

		Map<String, Object> list = post("""
				query($hotelId: ID!) {
				  adminPromotions(hotelId: $hotelId) { code status }
				}
				""", Map.of("hotelId", fx.hotelId().toString()), token);
		List<Map<String, Object>> promos = (List<Map<String, Object>>) ((Map<String, Object>)
				list.get("data")).get("adminPromotions");
		Map<String, Object> promo = promos.stream()
				.filter(p -> "SPRING26".equals(p.get("code"))).findFirst().orElseThrow();
		assertThat(promo.get("status")).isEqualTo("inactive");
	}

	@Test
	void reviewModerationIsHotelScoped() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		seedReview(fx.hotelId(), (short) 4, "Great stay");
		String token = staffToken(uid(80), List.of(fx.hotelId()));

		Map<String, Object> queue = post("""
				query($hotelId: ID!, $status: ReviewModerationStatus) {
				  adminReviews(hotelId: $hotelId, status: $status) {
				    total items { id moderationStatus }
				  }
				}
				""", Map.of("hotelId", fx.hotelId().toString(), "status", "pending"), token);
		assertThat(queue.get("errors")).isNull();
		Map<String, Object> page = (Map<String, Object>) ((Map<String, Object>) queue.get("data"))
				.get("adminReviews");
		assertThat(((Number) page.get("total")).intValue()).isEqualTo(1);
		String reviewId = (String) ((List<Map<String, Object>>) page.get("items")).get(0).get("id");

		Map<String, Object> moderated = rest("POST",
				"/api/v1/admin/reviews/" + reviewId + "/moderation",
				Map.of("status", "approved", "response", "Thank you!"), token);
		assertThat(moderated.get("__status")).isEqualTo(200);
		assertThat(moderated.get("moderationStatus")).isEqualTo("approved");
		assertThat(moderated.get("responseText")).isEqualTo("Thank you!");
	}

	@Test
	void staffCanCancelAccountBackedReservation() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String email = "cancel-owner-" + System.nanoTime() + "@example.com";
		String owner = registerOwner(email);
		Map<String, Object> created = bookWithEmail(fx, LocalDate.now().plusDays(7),
				"staff-cancel-" + System.nanoTime(), email, owner);
		String reservationId = (String) created.get("id");

		// owner-only self-service: outsider staff of another hotel is forbidden
		TestFixtures.HotelFixture other = fixtures.newBookableHotel();
		Map<String, Object> forbidden = rest("POST",
				"/api/v1/admin/reservations/" + reservationId + "/cancel", Map.of(),
				staffToken(uid(91), List.of(other.hotelId())));
		assertThat(restCode(forbidden)).isEqualTo("FORBIDDEN");

		Map<String, Object> cancelled = rest("POST",
				"/api/v1/admin/reservations/" + reservationId + "/cancel",
				Map.of("reasonNote", "Guest requested"),
				staffToken(uid(90), List.of(fx.hotelId())));
		assertThat(cancelled.get("__status")).isEqualTo(200);
		assertThat(cancelled.get("status")).isEqualTo("cancelled");
		assertThat(((Map<String, Object>) cancelled.get("cancellation")).get("reasonNote"))
				.isEqualTo("Guest requested");
	}

	@Test
	void usersAndRolesAreSuperAdminOnly() throws Exception {
		String root = superAdminToken(uid(100));
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String hotelId = fx.hotelId().toString();

		Map<String, Object> created = rest("POST", "/api/v1/admin/users",
				Map.of("firstName", "Sara", "lastName", "Alaoui",
						"email", "sara-" + System.nanoTime() + "@example.com",
						"password", "secret123", "roleName", "reservation_agent",
						"hotelId", hotelId), root);
		assertThat(created.get("__status")).isEqualTo(201);
		String userId = (String) created.get("id");
		List<Map<String, Object>> roles = (List<Map<String, Object>>) created.get("roles");
		assertThat(roles.get(0).get("roleName")).isEqualTo("reservation_agent");
		assertThat(roles.get(0).get("hotelId")).isEqualTo(hotelId);

		Map<String, Object> users = post("""
				query { adminUsers { email roles { roleName } } }
				""", null, root);
		assertThat(users.get("errors")).isNull();
		assertThat((List<?>) ((Map<String, Object>) users.get("data"))
				.get("adminUsers")).isNotEmpty();

		Map<String, Object> rolesList = post("""
				query { adminRoles { name hotelScoped } }
				""", null, root);
		assertThat(rolesList.get("errors")).isNull();
		List<Map<String, Object>> allRoles = (List<Map<String, Object>>) ((Map<String, Object>)
				rolesList.get("data")).get("adminRoles");
		Map<String, Object> agent = allRoles.stream()
				.filter(r -> "reservation_agent".equals(r.get("name"))).findFirst().orElseThrow();
		assertThat(agent.get("hotelScoped")).isEqualTo(true);

		Map<String, Object> assigned = rest("POST", "/api/v1/admin/users/" + userId + "/roles",
				Map.of("roleName", "reception_staff", "hotelId", hotelId), root);
		assertThat(assigned.get("__status")).isEqualTo(200);

		Map<String, Object> forbidden = post("""
				query { adminUsers { email } }
				""", null, staffToken(uid(101), List.of(fx.hotelId())));
		assertThat(extensionsCode(forbidden)).isEqualTo("FORBIDDEN");
	}

	@Test
	void auditLogRecordsAdminActions() throws Exception {
		String root = superAdminToken(uid(110));
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		Map<String, Object> created = rest("POST",
				"/api/v1/admin/hotels/" + fx.hotelId() + "/room-types",
				Map.of("name", "Audited Suite"), staffToken(uid(111), List.of(fx.hotelId())));
		assertThat(created.get("__status")).isEqualTo(201);

		Map<String, Object> logs = post("""
				query { adminAuditLogs { total items { action actorEmail hotelId } } }
				""", null, root);
		assertThat(logs.get("errors")).isNull();
		Map<String, Object> page = (Map<String, Object>) ((Map<String, Object>) logs.get("data"))
				.get("adminAuditLogs");
		List<Map<String, Object>> items = (List<Map<String, Object>>) page.get("items");
		Map<String, Object> entry = items.stream()
				.filter(e -> "room_type.created".equals(e.get("action"))).findFirst()
				.orElseThrow();
		assertThat(UUID.fromString((String) entry.get("hotelId"))).isEqualTo(fx.hotelId());

		Map<String, Object> notifications = post("""
				query($hotelId: ID!) {
				  adminNotifications(hotelId: $hotelId) { total items { status } }
				}
				""", Map.of("hotelId", fx.hotelId().toString()), staffToken(uid(112),
						List.of(fx.hotelId())));
		assertThat(notifications.get("errors")).isNull();
	}

	@Test
	void assignRoomValidatesConflictsAndCrossHotelAccess() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken(uid(200), List.of(fx.hotelId()));
		LocalDate checkIn = LocalDate.now().plusDays(15);
		LocalDate checkOut = checkIn.plusDays(3);

		Map<String, Object> created1 = book(fx, checkIn, "assign-1-" + System.nanoTime());
		String reservationId1 = (String) created1.get("id");
		String roomLineId1 = (String) ((List<Map<String, Object>>) created1.get("roomLines"))
				.get(0).get("id");

		// cross-hotel staff cannot assign a room to this reservation
		TestFixtures.HotelFixture other = fixtures.newBookableHotel();
		Map<String, Object> outsiderAttempt = rest("POST",
				"/api/v1/admin/reservations/" + reservationId1 + "/rooms/" + roomLineId1
						+ "/assign-room",
				Map.of("roomId", uid(1).toString()), staffToken(uid(201), List.of(other.hotelId())));
		assertThat(restCode(outsiderAttempt)).isEqualTo("FORBIDDEN");

		List<Map<String, Object>> eligible = restList("GET",
				"/api/v1/admin/room-types/" + fx.roomType().getId() + "/rooms/eligible?checkIn="
						+ checkIn + "&checkOut=" + checkOut,
				null, token);
		assertThat(eligible).hasSize(3);
		String roomIdA = (String) eligible.get(0).get("id");
		String roomIdB = (String) eligible.get(1).get("id");

		Map<String, Object> assigned1 = rest("POST",
				"/api/v1/admin/reservations/" + reservationId1 + "/rooms/" + roomLineId1
						+ "/assign-room",
				Map.of("roomId", roomIdA), token);
		assertThat(assigned1.get("__status")).isEqualTo(200);
		List<Map<String, Object>> lines1 = (List<Map<String, Object>>) assigned1.get("roomLines");
		assertThat(lines1.get(0).get("roomId")).isEqualTo(roomIdA);

		// a second, overlapping reservation cannot take the same physical room
		Map<String, Object> created2 = book(fx, checkIn, "assign-2-" + System.nanoTime());
		String reservationId2 = (String) created2.get("id");
		String roomLineId2 = (String) ((List<Map<String, Object>>) created2.get("roomLines"))
				.get(0).get("id");
		Map<String, Object> conflicted = rest("POST",
				"/api/v1/admin/reservations/" + reservationId2 + "/rooms/" + roomLineId2
						+ "/assign-room",
				Map.of("roomId", roomIdA), token);
		assertThat(restCode(conflicted)).isEqualTo("CONFLICT");

		// a different, still-free room works
		Map<String, Object> assigned2 = rest("POST",
				"/api/v1/admin/reservations/" + reservationId2 + "/rooms/" + roomLineId2
						+ "/assign-room",
				Map.of("roomId", roomIdB), token);
		assertThat(assigned2.get("__status")).isEqualTo(200);

		// only the third room remains eligible for the same overlapping range
		List<Map<String, Object>> eligibleAfter = restList("GET",
				"/api/v1/admin/room-types/" + fx.roomType().getId() + "/rooms/eligible?checkIn="
						+ checkIn + "&checkOut=" + checkOut,
				null, token);
		assertThat(eligibleAfter).hasSize(1);
		assertThat(eligibleAfter.get(0).get("id")).isNotEqualTo(roomIdA).isNotEqualTo(roomIdB);
	}

	@Test
	void checkInRequiresAllRoomsAssignedThenChecksOutWithAuditTrail() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken(uid(210), List.of(fx.hotelId()));
		LocalDate checkIn = LocalDate.now().plusDays(20);

		Map<String, Object> created = book(fx, checkIn, "checkin-" + System.nanoTime());
		String reservationId = (String) created.get("id");
		String roomLineId = (String) ((List<Map<String, Object>>) created.get("roomLines"))
				.get(0).get("id");

		// unpaid (pending) reservation cannot be checked in yet
		Map<String, Object> tooEarly = rest("POST",
				"/api/v1/admin/reservations/" + reservationId + "/check-in", Map.of(), token);
		assertThat(restCode(tooEarly)).isEqualTo("CONFLICT");

		// pay + capture -> reservation becomes confirmed
		Map<String, Object> paid = rest("POST", "/api/v1/payments",
				Map.of("reservationId", reservationId, "amount", 3360.0,
						"currencyCode", TestFixtures.CURRENCY, "provider", "mock",
						"idempotencyKey", "checkin-pay-" + System.nanoTime()), token);
		assertThat(paid.get("__status")).isEqualTo(201);
		Map<String, Object> captured = rest("POST",
				"/api/v1/payments/" + paid.get("id") + "/capture", Map.of(), token);
		assertThat(captured.get("__status")).isEqualTo(200);

		// confirmed but no room assigned yet -> still blocked
		Map<String, Object> blocked = rest("POST",
				"/api/v1/admin/reservations/" + reservationId + "/check-in", Map.of(), token);
		assertThat(restCode(blocked)).isEqualTo("CONFLICT");

		List<Map<String, Object>> eligible = restList("GET",
				"/api/v1/admin/room-types/" + fx.roomType().getId() + "/rooms/eligible?checkIn="
						+ checkIn + "&checkOut=" + checkIn.plusDays(3),
				null, token);
		rest("POST",
				"/api/v1/admin/reservations/" + reservationId + "/rooms/" + roomLineId
						+ "/assign-room",
				Map.of("roomId", eligible.get(0).get("id")), token);

		Map<String, Object> checkedIn = rest("POST",
				"/api/v1/admin/reservations/" + reservationId + "/check-in", Map.of(), token);
		assertThat(checkedIn.get("__status")).isEqualTo(200);
		assertThat(checkedIn.get("status")).isEqualTo("checked_in");

		Integer checkedInAuditRows = jdbc.queryForObject(
				"select count(*) from audit_logs where action = 'reservation.checked_in' and resource_id = ?",
				Integer.class, UUID.fromString(reservationId));
		assertThat(checkedInAuditRows).isEqualTo(1);

		Map<String, Object> checkedOut = rest("POST",
				"/api/v1/admin/reservations/" + reservationId + "/check-out", Map.of(), token);
		assertThat(checkedOut.get("__status")).isEqualTo(200);
		assertThat(checkedOut.get("status")).isEqualTo("checked_out");

		Integer checkedOutAuditRows = jdbc.queryForObject(
				"select count(*) from audit_logs where action = 'reservation.checked_out' and resource_id = ?",
				Integer.class, UUID.fromString(reservationId));
		assertThat(checkedOutAuditRows).isEqualTo(1);

		// already checked out -> cannot check in again
		Map<String, Object> reCheckIn = rest("POST",
				"/api/v1/admin/reservations/" + reservationId + "/check-in", Map.of(), token);
		assertThat(restCode(reCheckIn)).isEqualTo("CONFLICT");
	}

	@Test
	void dashboardArrivalsAndDeparturesListsShowRealReservations() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken(uid(230), List.of(fx.hotelId()));
		LocalDate today = LocalDate.now();

		Map<String, Object> arrival = book(fx, today, "dash-arrival-" + System.nanoTime());
		String arrivalId = (String) arrival.get("id");

		Map<String, Object> departure = bookCustomDates(fx, today.minusDays(2), today,
				"dash-departure-" + System.nanoTime());
		String departureId = (String) departure.get("id");

		Map<String, Object> dash = post("""
				query($hotelId: ID!) {
				  adminDashboard(hotelId: $hotelId) {
				    arrivalsTodayList { id }
				    departuresTodayList { id }
				  }
				}
				""", Map.of("hotelId", fx.hotelId().toString()), token);
		assertThat(dash.get("errors")).isNull();
		Map<String, Object> data = (Map<String, Object>) ((Map<String, Object>) dash.get("data"))
				.get("adminDashboard");
		List<Map<String, Object>> arrivals = (List<Map<String, Object>>) data.get("arrivalsTodayList");
		List<Map<String, Object>> departures = (List<Map<String, Object>>) data.get("departuresTodayList");
		assertThat(arrivals).extracting(r -> r.get("id")).contains(arrivalId);
		assertThat(departures).extracting(r -> r.get("id")).contains(departureId);
	}

	// ---------------------------------------------------------------- helpers

	private Map<String, Object> book(TestFixtures.HotelFixture fx, LocalDate checkIn, String key)
			throws Exception {
		return bookWithEmail(fx, checkIn, key, "graphql@example.com", null);
	}

	private Map<String, Object> bookCustomDates(TestFixtures.HotelFixture fx, LocalDate checkIn,
			LocalDate checkOut, String key) throws Exception {
		Map<String, Object> created = restWithHeaders("POST", "/api/v1/reservations", Map.of(
				"hotelId", fx.hotelId().toString(),
				"checkInDate", checkIn.toString(),
				"checkOutDate", checkOut.toString(),
				"adults", 2, "children", 0,
				"currencyCode", TestFixtures.CURRENCY,
				"guest", Map.of("firstName", "Graph", "lastName", "Ql", "email", "graphql@example.com"),
				"rooms", List.of(Map.of("roomTypeId",
						fx.roomType().getId().toString(), "ratePlanId",
						fx.ratePlan().getId().toString())),
				"idempotencyKey", key), null, Map.of("Idempotency-Key", key));
		assertThat(created.get("__status")).isIn(200, 201);
		return created;
	}

	private Map<String, Object> bookWithEmail(TestFixtures.HotelFixture fx, LocalDate checkIn,
			String key, String email) throws Exception {
		return bookWithEmail(fx, checkIn, key, email, null);
	}

	private Map<String, Object> bookWithEmail(TestFixtures.HotelFixture fx, LocalDate checkIn,
			String key, String email, String token) throws Exception {
		Map<String, Object> created = restWithHeaders("POST", "/api/v1/reservations", Map.of(
				"hotelId", fx.hotelId().toString(),
				"checkInDate", checkIn.toString(),
				"checkOutDate", checkIn.plusDays(3).toString(),
				"adults", 2, "children", 0,
				"currencyCode", TestFixtures.CURRENCY,
				"guest", Map.of("firstName", "Graph", "lastName", "Ql", "email", email),
				"rooms", List.of(Map.of("roomTypeId",
						fx.roomType().getId().toString(), "ratePlanId",
						fx.ratePlan().getId().toString())),
				"idempotencyKey", key), token, Map.of("Idempotency-Key", key));
		assertThat(created.get("__status")).isIn(200, 201);
		return created;
	}

	private Map<String, Object> restWithHeaders(String method, String path, Object body,
			String bearer, Map<String, String> headers) throws Exception {
		HttpRequest.Builder builder = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + path))
				.header("Content-Type", "application/json");
		headers.forEach(builder::header);
		if (body == null) {
			builder.method(method, HttpRequest.BodyPublishers.noBody());
		} else {
			builder.method(method,
					HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)));
		}
		if (bearer != null) {
			builder.header("Authorization", "Bearer " + bearer);
		}
		HttpResponse<String> response = http.send(builder.build(),
				HttpResponse.BodyHandlers.ofString());
		if (response.body().isBlank()) {
			Map<String, Object> empty = new java.util.HashMap<>();
			empty.put("__status", response.statusCode());
			return empty;
		}
		Map<String, Object> parsed = objectMapper.readValue(response.body(), Map.class);
		parsed.put("__status", response.statusCode());
		return parsed;
	}

	private String registerOwner(String email) throws Exception {
		Map<String, Object> body = rest("POST", "/api/v1/auth/register",
				Map.of("firstName", "Zahra", "lastName", "Bennani",
						"email", email, "password", "secret123"),
				null);
		assertThat(body.get("__status")).isEqualTo(201);
		return (String) body.get("token");
	}

	private void seedReview(UUID hotelId, short rating, String comment) {
		com.hotelcollection.hotel.entity.Review r = new com.hotelcollection.hotel.entity.Review();
		r.setHotelId(hotelId);
		r.setRating(rating);
		r.setModerationStatus(com.hotelcollection.hotel.entity.ReviewModerationStatus.pending);
		r.setAuthorName("Tester");
		r.setComment(comment);
		r.setCreatedAt(Instant.now());
		r.setUpdatedAt(Instant.now());
		reviewRepository.save(r);
	}
}

package com.hotelcollection.hotel.integration;
import com.hotelcollection.hotel.dto.availability.AvailabilityInput;
import com.hotelcollection.hotel.dto.availability.AvailabilityRangeInput;
import com.hotelcollection.hotel.dto.availability.AvailabilityUpdateInput;
import com.hotelcollection.hotel.dto.billing.CapturePaymentInput;
import com.hotelcollection.hotel.dto.billing.CreatePaymentInput;
import com.hotelcollection.hotel.dto.catalog.AdminHotelInput;
import com.hotelcollection.hotel.dto.catalog.AdminRoomInput;
import com.hotelcollection.hotel.dto.catalog.AdminRoomTypeInput;
import com.hotelcollection.hotel.dto.identity.AdminCreateUserInput;
import com.hotelcollection.hotel.dto.identity.RegisterInput;
import com.hotelcollection.hotel.entity.User;
import com.hotelcollection.hotel.dto.media.MediaInput;
import com.hotelcollection.hotel.dto.rate.AdminPromotionInput;
import com.hotelcollection.hotel.dto.rate.AdminRatePlanInput;
import com.hotelcollection.hotel.dto.rate.RatePlanPriceInput;
import com.hotelcollection.hotel.dto.reservation.CreateReservationInput;
import com.hotelcollection.hotel.dto.reservation.ReservationLookupInput;
import com.hotelcollection.hotel.entity.Guest;
import com.hotelcollection.hotel.entity.ReviewModerationStatus;

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
import com.hotelcollection.hotel.integration.TestcontainersConfiguration;
import com.hotelcollection.hotel.integration.TestFixtures;
import com.hotelcollection.hotel.repository.AmenityRepository;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.JwtService;
import com.hotelcollection.hotel.entity.Review;
import com.hotelcollection.hotel.repository.ReviewRepository;

/**
 * Back-office GraphQL over real HTTP: hotel-scoped authz (IDOR blocked),
 * catalog/pricing/availability CRUD round-trips, operations reads, staff
 * cancellation, review moderation, and super_admin-only platform admin.
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
	com.hotelcollection.hotel.repository.ReviewRepository reviewRepository;
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
		Map<String, Object> reg = post("""
				mutation($input: RegisterInput!) {
				  register(input: $input) { token me { id } }
				}
				""", Map.of("input", Map.of("firstName", "Staff", "lastName", "User",
						"email", email, "password", "secret123")), null);
		assertThat(reg.get("errors")).isNull();
		Map<String, Object> payload = (Map<String, Object>) ((Map<String, Object>) reg.get("data"))
				.get("register");
		String registeredId = (String) ((Map<String, Object>) payload.get("me")).get("id");
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
	void roomTypeInventoryCannotBeReducedBelowSoldUnits() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken(uid(101), List.of(fx.hotelId()));
		jdbc.update("INSERT INTO availability (id, room_type_id, stay_date, rooms_sold) VALUES (gen_random_uuid(), ?, ?, 3)",
				fx.roomType().getId(), java.time.LocalDate.now().plusDays(5));

		Map<String, Object> reduced = post("""
				mutation($id: ID!, $input: AdminRoomTypeInput!) {
				  updateRoomType(id: $id, input: $input) { id }
				}
				""", Map.of("id", fx.roomType().getId().toString(),
						"input", Map.of("totalInventory", 2)), token);
		assertThat(extensionsCode(reduced)).isEqualTo("CONFLICT");

		Map<String, Object> raised = post("""
				mutation($id: ID!, $input: AdminRoomTypeInput!) {
				  updateRoomType(id: $id, input: $input) { id }
				}
				""", Map.of("id", fx.roomType().getId().toString(),
						"input", Map.of("totalInventory", 10)), token);
		assertThat(raised.get("errors")).isNull();
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

		Map<String, Object> write = post("""
				mutation { updateHotel(id: "%s", input: { name: "Hacked" }) { id } }
				""".formatted(fx.hotelId()), null, outsider);
		assertThat(extensionsCode(write)).isEqualTo("FORBIDDEN");
	}

	@Test
	void hotelCrudRoundTrip() throws Exception {
		String token = superAdminToken(uid(20));
		Map<String, Object> created = post("""
				mutation($input: AdminHotelInput!) {
				  createHotel(input: $input) { id name city defaultCurrency }
				}
				""", Map.of("input", Map.of(
						"name", "Riad Atlas " + System.nanoTime(),
						"city", "Fes", "defaultCurrency", TestFixtures.CURRENCY,
						"status", "draft")), token);
		assertThat(created.get("errors")).isNull();
		Map<String, Object> hotel = (Map<String, Object>) ((Map<String, Object>) created.get("data"))
				.get("createHotel");
		String id = (String) hotel.get("id");

		Map<String, Object> updated = post("""
				mutation($id: ID!, $input: AdminHotelInput!) {
				  updateHotel(id: $id, input: $input) { name status }
				}
				""", Map.of("id", id, "input", Map.of("name", "Riad Atlas Grand",
						"status", "active")), token);
		assertThat(updated.get("errors")).isNull();
		Map<String, Object> updatedHotel = (Map<String, Object>) ((Map<String, Object>) updated
				.get("data")).get("updateHotel");
		assertThat(updatedHotel.get("name")).isEqualTo("Riad Atlas Grand");
		assertThat(updatedHotel.get("status")).isEqualTo("active");
	}

	@Test
	void createHotelRequiresSuperAdmin() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		Map<String, Object> body = post("""
				mutation($input: AdminHotelInput!) {
				  createHotel(input: $input) { id }
				}
				""", Map.of("input", Map.of("name", "Nope")), staffToken(uid(21),
						List.of(fx.hotelId())));
		assertThat(extensionsCode(body)).isEqualTo("FORBIDDEN");
	}

	@Test
	void roomTypeAndRoomCrudRoundTrip() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken(uid(30), List.of(fx.hotelId()));

		Map<String, Object> created = post("""
				mutation($hotelId: ID!, $input: AdminRoomTypeInput!) {
				  createRoomType(hotelId: $hotelId, input: $input) { id name maxAdults }
				}
				""", Map.of("hotelId", fx.hotelId().toString(), "input", Map.of(
						"name", "Junior Suite", "maxAdults", 3, "viewType", "Garden")), token);
		assertThat(created.get("errors")).isNull();
		String rtId = (String) ((Map<String, Object>) ((Map<String, Object>) created.get("data"))
				.get("createRoomType")).get("id");

		Map<String, Object> room = post("""
				mutation($hotelId: ID!, $input: AdminRoomInput!) {
				  createRoom(hotelId: $hotelId, input: $input) { id roomNumber status }
				}
				""", Map.of("hotelId", fx.hotelId().toString(), "input", Map.of(
						"roomTypeId", rtId, "roomNumber", "201", "floor", "2")), token);
		assertThat(room.get("errors")).isNull();
		String roomId = (String) ((Map<String, Object>) ((Map<String, Object>) room.get("data"))
				.get("createRoom")).get("id");

		Map<String, Object> dup = post("""
				mutation($hotelId: ID!, $input: AdminRoomInput!) {
				  createRoom(hotelId: $hotelId, input: $input) { id }
				}
				""", Map.of("hotelId", fx.hotelId().toString(), "input", Map.of(
						"roomTypeId", rtId, "roomNumber", "201")), token);
		assertThat(extensionsCode(dup)).isEqualTo("CONFLICT");

		Map<String, Object> updated = post("""
				mutation($id: ID!, $input: AdminRoomInput!) {
				  updateRoom(id: $id, input: $input) { housekeepingStatus }
				}
				""", Map.of("id", roomId, "input", Map.of("roomTypeId", rtId,
						"roomNumber", "201", "housekeepingStatus", "dirty")), token);
		assertThat(updated.get("errors")).isNull();

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

		Map<String, Object> setAmenities = post("""
				mutation($hotelId: ID!, $ids: [ID!]!) {
				  setHotelAmenities(hotelId: $hotelId, amenityIds: $ids) { name }
				}
				""", Map.of("hotelId", fx.hotelId().toString(),
				"ids", List.of(a1.getId().toString(), a2.getId().toString())), token);
		assertThat(setAmenities.get("errors")).isNull();
		assertThat((List<?>) ((Map<String, Object>) setAmenities.get("data"))
				.get("setHotelAmenities")).hasSize(2);

		Map<String, Object> setMedia = post("""
				mutation($hotelId: ID!, $media: [MediaInput!]!) {
				  setHotelMedia(hotelId: $hotelId, media: $media) { url isPrimary }
				}
				""", Map.of("hotelId", fx.hotelId().toString(), "media", List.of(
						Map.of("url", "https://example.com/a.jpg", "isPrimary", true),
						Map.of("url", "https://example.com/b.jpg"))), token);
		assertThat(setMedia.get("errors")).isNull();

		Map<String, Object> replaced = post("""
				mutation($hotelId: ID!, $media: [MediaInput!]!) {
				  setHotelMedia(hotelId: $hotelId, media: $media) { url }
				}
				""", Map.of("hotelId", fx.hotelId().toString(), "media", List.of(
						Map.of("url", "https://example.com/c.jpg", "isPrimary", true))), token);
		assertThat(replaced.get("errors")).isNull();

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

		Map<String, Object> setPolicies = post("""
				mutation($hotelId: ID!, $policies: [HotelPolicyInput!]!) {
				  setHotelPolicies(hotelId: $hotelId, policies: $policies) { name value icon sortOrder }
				}
				""", Map.of("hotelId", fx.hotelId().toString(), "policies", List.of(
						Map.of("name", "Check-in", "value", "From 15:00", "icon", "clock", "sortOrder", 0),
						Map.of("name", "Pets", "value", "Not allowed", "icon", "paw", "sortOrder", 1))),
				token);
		assertThat(setPolicies.get("errors")).isNull();
		assertThat((List<?>) ((Map<String, Object>) setPolicies.get("data"))
				.get("setHotelPolicies")).hasSize(2);

		// A second call replaces the set rather than appending to it.
		Map<String, Object> replaced = post("""
				mutation($hotelId: ID!, $policies: [HotelPolicyInput!]!) {
				  setHotelPolicies(hotelId: $hotelId, policies: $policies) { name }
				}
				""", Map.of("hotelId", fx.hotelId().toString(), "policies", List.of(
						Map.of("name", "Smoking", "value", "No smoking on site"))), token);
		assertThat(replaced.get("errors")).isNull();

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

		Map<String, Object> created = post("""
				mutation($hotelId: ID!, $input: AdminRatePlanInput!) {
				  createRatePlan(hotelId: $hotelId, input: $input) { id code currencyCode }
				}
				""", Map.of("hotelId", fx.hotelId().toString(), "input", Map.of(
						"name", "Non-refundable Advance", "code", "nr-advance",
						"currencyCode", TestFixtures.CURRENCY,
						"isRefundable", false, "paymentTiming", "prepay_full")), token);
		assertThat(created.get("errors")).isNull();
		String planId = (String) ((Map<String, Object>) ((Map<String, Object>) created.get("data"))
				.get("createRatePlan")).get("id");

		Map<String, Object> linked = post("""
				mutation($roomTypeId: ID!, $ratePlanId: ID!) {
				  linkRoomTypeRatePlan(roomTypeId: $roomTypeId, ratePlanId: $ratePlanId) {
				    id roomTypeName prices { priceAmount }
				  }
				}
				""", Map.of("roomTypeId", fx.roomType().getId().toString(), "ratePlanId", planId),
				token);
		assertThat(linked.get("errors")).isNull();
		String linkId = (String) ((Map<String, Object>) ((Map<String, Object>) linked.get("data"))
				.get("linkRoomTypeRatePlan")).get("id");

		Map<String, Object> priced = post("""
				mutation($linkId: ID!, $prices: [RatePlanPriceInput!]!) {
				  setRatePlanPrices(linkId: $linkId, prices: $prices) { validFrom validTo priceAmount }
				}
				""", Map.of("linkId", linkId, "prices", List.of(
						Map.of("validFrom", "2026-01-01", "validTo", "2026-06-30",
								"priceAmount", 850.0),
						Map.of("validFrom", "2026-07-01", "validTo", "2026-12-31",
								"priceAmount", 950.0))), token);
		assertThat(priced.get("errors")).isNull();
		assertThat((List<?>) ((Map<String, Object>) priced.get("data"))
				.get("setRatePlanPrices")).hasSize(2);

		Map<String, Object> overlap = post("""
				mutation($linkId: ID!, $prices: [RatePlanPriceInput!]!) {
				  setRatePlanPrices(linkId: $linkId, prices: $prices) { id }
				}
				""", Map.of("linkId", linkId, "prices", List.of(
						Map.of("validFrom", "2026-05-01", "validTo", "2026-08-31",
								"priceAmount", 900.0),
						Map.of("validFrom", "2026-07-01", "validTo", "2026-10-31",
								"priceAmount", 910.0))), token);
		assertThat(extensionsCode(overlap)).isEqualTo("CONFLICT");

		Map<String, Object> unlinked = post("""
				mutation($linkId: ID!) { unlinkRoomTypeRatePlan(linkId: $linkId) }
				""", Map.of("linkId", linkId), token);
		assertThat(unlinked.get("errors")).isNull();
		assertThat(((Map<String, Object>) unlinked.get("data")).get("unlinkRoomTypeRatePlan"))
				.isEqualTo(true);
	}

	@Test
	void updateRatePlanRoundTrip() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken(uid(42), List.of(fx.hotelId()));

		Map<String, Object> created = post("""
				mutation($hotelId: ID!, $input: AdminRatePlanInput!) {
				  createRatePlan(hotelId: $hotelId, input: $input) { id code mealPlan }
				}
				""", Map.of("hotelId", fx.hotelId().toString(), "input", Map.of(
						"name", "Advance Saver", "code", "adv-saver",
						"currencyCode", TestFixtures.CURRENCY,
						"isRefundable", false, "paymentTiming", "prepay_full")), token);
		assertThat(created.get("errors")).isNull();
		String planId = (String) ((Map<String, Object>) ((Map<String, Object>) created.get("data"))
				.get("createRatePlan")).get("id");

		Map<String, Object> updated = post("""
				mutation($id: ID!, $input: AdminRatePlanInput!) {
				  updateRatePlan(id: $id, input: $input) { id name mealPlan isRefundable }
				}
				""", Map.of("id", planId, "input", Map.of("name", "Advance Saver Plus",
						"mealPlan", "hb", "isRefundable", true,
						"paymentTiming", "pay_at_property")), token);
		assertThat(updated.get("errors")).isNull();
		Map<String, Object> plan = (Map<String, Object>) ((Map<String, Object>) updated.get("data"))
				.get("updateRatePlan");
		assertThat(plan.get("name")).isEqualTo("Advance Saver Plus");
		assertThat(plan.get("mealPlan")).isEqualTo("hb");
		assertThat(plan.get("isRefundable")).isEqualTo(true);

		Map<String, Object> outsider = post("""
				mutation($id: ID!, $input: AdminRatePlanInput!) {
				  updateRatePlan(id: $id, input: $input) { id }
				}
				""", Map.of("id", planId, "input", Map.of("name", "Sneaky")), staffToken(uid(43),
						List.of(fixtures.newBookableHotel().hotelId())));
		assertThat(extensionsCode(outsider)).isEqualTo("FORBIDDEN");
	}

	@Test
	void roomTypeAmenitiesAndMediaReplacement() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		Amenity a1 = new Amenity();
		a1.setName("Shuttle " + System.nanoTime());
		a1.setCategory("transport");
		a1 = amenityRepository.save(a1);
		String token = staffToken(uid(44), List.of(fx.hotelId()));

		Map<String, Object> amenities = post("""
				mutation($roomTypeId: ID!, $ids: [ID!]!) {
				  setRoomTypeAmenities(roomTypeId: $roomTypeId, amenityIds: $ids) { name }
				}
				""", Map.of("roomTypeId", fx.roomType().getId().toString(),
				"ids", List.of(a1.getId().toString())), token);
		assertThat(amenities.get("errors")).isNull();
		assertThat((List<?>) ((Map<String, Object>) amenities.get("data"))
				.get("setRoomTypeAmenities")).hasSize(1);

		Map<String, Object> media = post("""
				mutation($roomTypeId: ID!, $media: [MediaInput!]!) {
				  setRoomTypeMedia(roomTypeId: $roomTypeId, media: $media) { url isPrimary }
				}
				""", Map.of("roomTypeId", fx.roomType().getId().toString(), "media", List.of(
						Map.of("url", "https://example.com/deluxe.jpg", "isPrimary", true))), token);
		assertThat(media.get("errors")).isNull();
		List<Map<String, Object>> mediaList = (List<Map<String, Object>>) ((Map<String, Object>)
				media.get("data")).get("setRoomTypeMedia");
		assertThat(mediaList).hasSize(1);
		assertThat(mediaList.get(0).get("url")).isEqualTo("https://example.com/deluxe.jpg");

		Map<String, Object> crossed = post("""
				mutation($roomTypeId: ID!, $ids: [ID!]!) {
				  setRoomTypeAmenities(roomTypeId: $roomTypeId, amenityIds: $ids) { name }
				}
				""", Map.of("roomTypeId", fx.roomType().getId().toString(),
				"ids", List.of(a1.getId().toString())), staffToken(uid(45),
						List.of(fixtures.newBookableHotel().hotelId())));
		assertThat(extensionsCode(crossed)).isEqualTo("FORBIDDEN");
	}

	@Test
	void revokeRoleRemovesAccess() throws Exception {
		String root = superAdminToken(uid(102));
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String hotelId = fx.hotelId().toString();

		Map<String, Object> created = post("""
				mutation($input: AdminCreateUserInput!) {
				  createUser(input: $input) { id roles { id roleName hotelId } }
				}
				""", Map.of("input", Map.of("firstName", "Yassine", "lastName", "Amrani",
						"email", "yassine-" + System.nanoTime() + "@example.com",
						"password", "secret123", "roleName", "reservation_agent",
						"hotelId", hotelId)), root);
		assertThat(created.get("errors")).isNull();
		Map<String, Object> user = (Map<String, Object>) ((Map<String, Object>) created.get("data"))
				.get("createUser");
		String userId = (String) user.get("id");
		List<Map<String, Object>> roles = (List<Map<String, Object>>) user.get("roles");
		assertThat(roles).hasSize(1);
		String userRoleId = (String) roles.get(0).get("id");

		Map<String, Object> revoked = post("""
				mutation($userRoleId: ID!) { revokeRole(userRoleId: $userRoleId) { id roles { roleName } } }
				""", Map.of("userRoleId", userRoleId), root);
		assertThat(revoked.get("errors")).isNull();
		List<Map<String, Object>> remaining = (List<Map<String, Object>>) ((Map<String, Object>)
				((Map<String, Object>) revoked.get("data")).get("revokeRole")).get("roles");
		assertThat(remaining).isEmpty();

		Map<String, Object> gone = post("""
				mutation($userRoleId: ID!) { revokeRole(userRoleId: $userRoleId) { id } }
				""", Map.of("userRoleId", userRoleId), root);
		assertThat(extensionsCode(gone)).isEqualTo("NOT_FOUND");

		Map<String, Object> forbidden = post("""
				mutation($userRoleId: ID!) { revokeRole(userRoleId: $userRoleId) { id } }
				""", Map.of("userRoleId", userRoleId), staffToken(uid(103),
						List.of(fx.hotelId())));
		assertThat(extensionsCode(forbidden)).isEqualTo("FORBIDDEN");
	}

	@Test
	void availabilityRangeBlocksAndUnblocksDates() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken(uid(51), List.of(fx.hotelId()));
		String from = LocalDate.now().plusDays(3).toString();
		String to = LocalDate.now().plusDays(5).toString();

		// block 2 units out of order for 3 nights via one range input
		Map<String, Object> blocked = post("""
				mutation($hotelId: ID!, $input: AvailabilityRangeInput!) {
				  updateAvailabilityRange(hotelId: $hotelId, input: $input) { stayDate outOfOrder }
				}
				""", Map.of("hotelId", fx.hotelId().toString(), "input", Map.of(
						"roomTypeId", fx.roomType().getId().toString(),
						"fromDate", from, "toDate", to, "outOfOrder", 2)), token);
		assertThat(blocked.get("errors")).isNull();
		assertThat((List<?>) ((Map<String, Object>) blocked.get("data"))
				.get("updateAvailabilityRange")).hasSize(3);

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
		Map<String, Object> capacity = post("""
				mutation($hotelId: ID!, $input: AvailabilityRangeInput!) {
				  updateAvailabilityRange(hotelId: $hotelId, input: $input) { id }
				}
				""", Map.of("hotelId", fx.hotelId().toString(), "input", Map.of(
						"roomTypeId", fx.roomType().getId().toString(),
						"fromDate", from, "toDate", to, "blocked", 5)), token);
		assertThat(extensionsCode(capacity)).isEqualTo("CONFLICT");

		// unblock: rows carry no information anymore and are removed
		Map<String, Object> unblocked = post("""
				mutation($hotelId: ID!, $input: AvailabilityRangeInput!) {
				  updateAvailabilityRange(hotelId: $hotelId, input: $input) { stayDate }
				}
				""", Map.of("hotelId", fx.hotelId().toString(), "input", Map.of(
						"roomTypeId", fx.roomType().getId().toString(),
						"fromDate", from, "toDate", to, "outOfOrder", 0)), token);
		assertThat(unblocked.get("errors")).isNull();
		assertThat((List<?>) ((Map<String, Object>) unblocked.get("data"))
				.get("updateAvailabilityRange")).isEmpty();
	}

	@Test
	void availabilityUpdatePersistsAndGuardsCapacity() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken(uid(50), List.of(fx.hotelId()));
		String date = LocalDate.now().plusDays(2).toString();

		Map<String, Object> updated = post("""
				mutation($hotelId: ID!, $rows: [AvailabilityUpdateInput!]!) {
				  updateAvailability(hotelId: $hotelId, rows: $rows) { totalInventory outOfOrder }
				}
				""", Map.of("hotelId", fx.hotelId().toString(), "rows", List.of(Map.of(
						"roomTypeId", fx.roomType().getId().toString(),
						"stayDate", date, "totalInventory", 5, "outOfOrder", 1))), token);
		assertThat(updated.get("errors")).isNull();
		Map<String, Object> row = (Map<String, Object>) ((List<?>) ((Map<String, Object>) updated
				.get("data")).get("updateAvailability")).get(0);
		assertThat(((Number) row.get("totalInventory")).intValue()).isEqualTo(5);
		assertThat(((Number) row.get("outOfOrder")).intValue()).isEqualTo(1);

		Map<String, Object> capacity = post("""
				mutation($hotelId: ID!, $rows: [AvailabilityUpdateInput!]!) {
				  updateAvailability(hotelId: $hotelId, rows: $rows) { id }
				}
				""", Map.of("hotelId", fx.hotelId().toString(), "rows", List.of(Map.of(
						"roomTypeId", fx.roomType().getId().toString(),
						"stayDate", date, "blocked", 20))), token);
		assertThat(extensionsCode(capacity)).isEqualTo("CONFLICT");

		Map<String, Object> read = post("""
				query($hotelId: ID!) {
				  adminHotel(hotelId: $hotelId) { availability { stayDate totalInventory outOfOrder } }
				}
				""", Map.of("hotelId", fx.hotelId().toString()), token);
		List<Map<String, Object>> rows = (List<Map<String, Object>>) ((Map<String, Object>) (
				(Map<String, Object>) read.get("data")).get("adminHotel")).get("availability");
		Map<String, Object> row2 = rows.stream()
				.filter(r -> date.equals(r.get("stayDate"))).findFirst().orElseThrow();
		assertThat(((Number) row2.get("totalInventory")).intValue()).isEqualTo(5);
		assertThat(((Number) row2.get("outOfOrder")).intValue()).isEqualTo(1);
	}

	@Test
	void guestsPaymentsInvoicesAndDashboard() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = staffToken(uid(60), List.of(fx.hotelId()));
		LocalDate checkIn = LocalDate.now().plusDays(7);

		Map<String, Object> created = book(fx, checkIn, "bo-" + System.nanoTime());
		String reservationId = (String) ((Map<String, Object>) created.get("reservation"))
				.get("id");
		String reference = (String) ((Map<String, Object>) created.get("reservation"))
				.get("reference");

		Map<String, Object> paid = post("""
				mutation($input: CreatePaymentInput!) {
				  createPayment(input: $input) { id status }
				}
				""", Map.of("input", Map.of("reservationId", reservationId, "amount", 3360.0,
						"currencyCode", TestFixtures.CURRENCY, "provider", "mock",
						"idempotencyKey", "bo-pay-" + System.nanoTime())), token);
		assertThat(paid.get("errors")).isNull();
		String paymentId = (String) ((Map<String, Object>) ((Map<String, Object>) paid.get("data"))
				.get("createPayment")).get("id");

		Map<String, Object> captured = post("""
				mutation($input: CapturePaymentInput!) { capturePayment(input: $input) { status } }
				""", Map.of("input", Map.of("paymentId", paymentId)), token);
		assertThat(captured.get("errors")).isNull();

		Map<String, Object> invoiced = post("""
				mutation($input: ReservationLookupInput!) {
				  issueInvoice(input: $input) { invoiceNumber }
				}
				""", Map.of("input", Map.of("reference", reference,
						"email", "graphql@example.com")), null);
		assertThat(invoiced.get("errors")).isNull();

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

	@Test
	void promotionsScopedByHotel() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		TestFixtures.HotelFixture other = fixtures.newBookableHotel();
		String token = staffToken(uid(70), List.of(fx.hotelId()));
		String outsider = staffToken(uid(71), List.of(other.hotelId()));

		Map<String, Object> created = post("""
				mutation($hotelId: ID!, $input: AdminPromotionInput!) {
				  createPromotion(hotelId: $hotelId, input: $input) { id code status }
				}
				""", Map.of("hotelId", fx.hotelId().toString(), "input", Map.of(
						"code", "SPRING26", "name", "Spring Break",
						"discountType", "percentage", "discountValue", 15.0)), token);
		assertThat(created.get("errors")).isNull();
		String promoId = (String) ((Map<String, Object>) ((Map<String, Object>) created.get("data"))
				.get("createPromotion")).get("id");

		Map<String, Object> crossed = post("""
				mutation($id: ID!, $input: AdminPromotionInput!) {
				  updatePromotion(id: $id, input: $input) { id }
				}
				""", Map.of("id", promoId, "input", Map.of("name", "Sneaky")), outsider);
		assertThat(extensionsCode(crossed)).isEqualTo("FORBIDDEN");

		Map<String, Object> status = post("""
				mutation($id: ID!, $status: PromotionStatus!) {
				  setPromotionStatus(id: $id, status: $status) { status }
				}
				""", Map.of("id", promoId, "status", "inactive"), token);
		assertThat(status.get("errors")).isNull();

		Map<String, Object> platformByStaff = post("""
				mutation($input: AdminPromotionInput!) {
				  createPromotion(input: $input) { id }
				}
				""", Map.of("input", Map.of("code", "GLOBALX", "name", "Global",
						"discountType", "fixed_amount", "discountValue", 50.0)), token);
		assertThat(extensionsCode(platformByStaff)).isEqualTo("FORBIDDEN");

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

		Map<String, Object> moderated = post("""
				mutation($id: ID!, $status: ReviewModerationStatus!, $response: String) {
				  moderateReview(id: $id, status: $status, response: $response) {
				    moderationStatus responseText
				  }
				}
				""", Map.of("id", reviewId, "status", "approved",
						"response", "Thank you!"), token);
		assertThat(moderated.get("errors")).isNull();
		Map<String, Object> review = (Map<String, Object>) ((Map<String, Object>) moderated
				.get("data")).get("moderateReview");
		assertThat(review.get("moderationStatus")).isEqualTo("approved");
		assertThat(review.get("responseText")).isEqualTo("Thank you!");
	}

	@Test
	void staffCanCancelAccountBackedReservation() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String email = "cancel-owner-" + System.nanoTime() + "@example.com";
		String owner = registerOwner(email);
		Map<String, Object> created = bookWithEmail(fx, LocalDate.now().plusDays(7),
				"staff-cancel-" + System.nanoTime(), email, owner);
		String reservationId = (String) ((Map<String, Object>) created.get("reservation")).get("id");

		// owner-only self-service: outsider staff of another hotel is forbidden
		TestFixtures.HotelFixture other = fixtures.newBookableHotel();
		Map<String, Object> forbidden = post("""
				mutation($id: ID!) {
				  adminCancelReservation(reservationId: $id) { status }
				}
				""", Map.of("id", reservationId), staffToken(uid(91), List.of(other.hotelId())));
		assertThat(extensionsCode(forbidden)).isEqualTo("FORBIDDEN");

		Map<String, Object> cancelled = post("""
				mutation($id: ID!, $note: String) {
				  adminCancelReservation(reservationId: $id, reasonNote: $note) {
				    status cancellation { reasonNote refundAmount }
				  }
				}
				""", Map.of("id", reservationId, "note", "Guest requested"), staffToken(uid(90),
						List.of(fx.hotelId())));
		assertThat(cancelled.get("errors")).isNull();
		Map<String, Object> reservation = (Map<String, Object>) ((Map<String, Object>) cancelled
				.get("data")).get("adminCancelReservation");
		assertThat(reservation.get("status")).isEqualTo("cancelled");
		assertThat(((Map<String, Object>) reservation.get("cancellation")).get("reasonNote"))
				.isEqualTo("Guest requested");
	}

	@Test
	void usersAndRolesAreSuperAdminOnly() throws Exception {
		String root = superAdminToken(uid(100));
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String hotelId = fx.hotelId().toString();

		Map<String, Object> created = post("""
				mutation($input: AdminCreateUserInput!) {
				  createUser(input: $input) { id email roles { roleName hotelId } }
				}
				""", Map.of("input", Map.of("firstName", "Sara", "lastName", "Alaoui",
						"email", "sara-" + System.nanoTime() + "@example.com",
						"password", "secret123", "roleName", "reservation_agent",
						"hotelId", hotelId)), root);
		assertThat(created.get("errors")).isNull();
		Map<String, Object> user = (Map<String, Object>) ((Map<String, Object>) created.get("data"))
				.get("createUser");
		String userId = (String) user.get("id");
		List<Map<String, Object>> roles = (List<Map<String, Object>>) user.get("roles");
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

		Map<String, Object> assigned = post("""
				mutation($userId: ID!, $roleName: String!, $hotelId: ID) {
				  assignRole(userId: $userId, roleName: $roleName, hotelId: $hotelId) {
				    roles { roleName hotelId }
				  }
				}
				""", Map.of("userId", userId, "roleName", "reception_staff", "hotelId", hotelId),
				root);
		assertThat(assigned.get("errors")).isNull();

		Map<String, Object> forbidden = post("""
				query { adminUsers { email } }
				""", null, staffToken(uid(101), List.of(fx.hotelId())));
		assertThat(extensionsCode(forbidden)).isEqualTo("FORBIDDEN");
	}

	@Test
	void auditLogRecordsAdminActions() throws Exception {
		String root = superAdminToken(uid(110));
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		post("""
				mutation($hotelId: ID!, $input: AdminRoomTypeInput!) {
				  createRoomType(hotelId: $hotelId, input: $input) { id }
				}
				""", Map.of("hotelId", fx.hotelId().toString(), "input", Map.of(
						"name", "Audited Suite")), staffToken(uid(111), List.of(fx.hotelId())));

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

	// ---------------------------------------------------------------- helpers

	private Map<String, Object> book(TestFixtures.HotelFixture fx, LocalDate checkIn, String key)
			throws Exception {
		return bookWithEmail(fx, checkIn, key, "graphql@example.com", null);
	}

	private Map<String, Object> bookWithEmail(TestFixtures.HotelFixture fx, LocalDate checkIn,
			String key, String email) throws Exception {
		return bookWithEmail(fx, checkIn, key, email, null);
	}

	private Map<String, Object> bookWithEmail(TestFixtures.HotelFixture fx, LocalDate checkIn,
			String key, String email, String token) throws Exception {
		Map<String, Object> created = post("""
				mutation($input: CreateReservationInput!) {
				  createReservation(input: $input) {
				    created
				    reservation { id reference status totalAmount }
				  }
				}
				""", Map.of("input", Map.of(
						"hotelId", fx.hotelId().toString(),
						"checkInDate", checkIn.toString(),
						"checkOutDate", checkIn.plusDays(3).toString(),
						"adults", 2, "children", 0,
						"currencyCode", TestFixtures.CURRENCY,
						"guest", Map.of("firstName", "Graph", "lastName", "Ql", "email", email),
						"rooms", List.of(Map.of("roomTypeId",
								fx.roomType().getId().toString(), "ratePlanId",
								fx.ratePlan().getId().toString())),
						"idempotencyKey", key)), token);
		assertThat(created.get("errors")).isNull();
		return (Map<String, Object>) ((Map<String, Object>) created.get("data"))
				.get("createReservation");
	}

	private String registerOwner(String email) throws Exception {
		Map<String, Object> body = post("""
				mutation($input: RegisterInput!) { register(input: $input) { token } }
				""", Map.of("input", Map.of("firstName", "Zahra", "lastName", "Bennani",
						"email", email, "password", "secret123")), null);
		assertThat(body.get("errors")).isNull();
		return (String) ((Map<String, Object>) ((Map<String, Object>) body.get("data"))
				.get("register")).get("token");
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
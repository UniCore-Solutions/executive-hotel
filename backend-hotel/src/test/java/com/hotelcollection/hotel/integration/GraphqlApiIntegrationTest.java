package com.hotelcollection.hotel.integration;
import com.hotelcollection.hotel.dto.availability.AvailabilityInput;
import com.hotelcollection.hotel.dto.billing.CapturePaymentInput;
import com.hotelcollection.hotel.dto.billing.CreatePaymentInput;
import com.hotelcollection.hotel.dto.catalog.HotelSearchInput;
import com.hotelcollection.hotel.dto.identity.RegisterInput;
import com.hotelcollection.hotel.dto.rate.QuoteInput;
import com.hotelcollection.hotel.dto.reservation.CancelReservationInput;
import com.hotelcollection.hotel.dto.reservation.CreateReservationInput;
import com.hotelcollection.hotel.dto.reservation.ReservationLookupInput;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
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
import com.hotelcollection.hotel.entity.Review;
import com.hotelcollection.hotel.entity.ReviewModerationStatus;
import com.hotelcollection.hotel.repository.HotelRepository;
import com.hotelcollection.hotel.repository.ReviewRepository;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.JwtService;

/**
 * GraphQL over real HTTP with Spring Security: anonymous discovery works,
 * booking mutations work, auth errors map to GraphQL errors with codes,
 * and adminHotel is hotel-scoped (403 for outsiders).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ContextConfiguration(classes = TestcontainersConfiguration.class)
class GraphqlApiIntegrationTest {

	private static UUID uid(long n) { return new UUID(0, n); }

	@LocalServerPort
	int port;

	@Autowired
	TestFixtures fixtures;
	@Autowired
	com.hotelcollection.hotel.security.JwtService jwtService;
	@Autowired
	com.hotelcollection.hotel.repository.HotelRepository hotelRepository;
	@Autowired
	com.hotelcollection.hotel.repository.ReviewRepository reviewRepository;
	@Autowired
	com.hotelcollection.hotel.repository.ExperienceRepository experienceRepository;
	@Autowired
	com.hotelcollection.hotel.repository.RestaurantRepository restaurantRepository;
	@Autowired
	com.hotelcollection.hotel.repository.ExtraRepository extraRepository;
	@Autowired
	com.hotelcollection.hotel.repository.FaqRepository faqRepository;
	@Autowired
	com.hotelcollection.hotel.repository.PromotionRepository promotionRepository;
	@Autowired
	com.hotelcollection.hotel.repository.ReservationRepository reservationRepository;
	@Autowired
	com.hotelcollection.hotel.repository.GuestRepository guestRepository;

	private final ObjectMapper objectMapper = new ObjectMapper();

	private final HttpClient http = HttpClient.newBuilder()
			.connectTimeout(Duration.ofSeconds(10)).build();

	@SuppressWarnings("unchecked")
	private Map<String, Object> post(String query, Map<String, Object> variables, String bearer)
			throws Exception {
		HttpRequest.Builder builder = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + "/graphql"))
				.timeout(Duration.ofSeconds(30))
				.header("Content-Type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(
						Map.of("query", query, "variables", variables == null ? Map.of() : variables))));
		if (bearer != null) {
			builder.header("Authorization", "Bearer " + bearer);
		}
		HttpResponse<String> response = http.send(builder.build(),
				HttpResponse.BodyHandlers.ofString());
		assertThat(response.statusCode()).isEqualTo(200);
		return objectMapper.readValue(response.body(), Map.class);
	}

	@Test
	void anonymousCanDiscoverHotels() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		Map<String, Object> body = post("""
				query($id: ID!) {
				  hotel(id: $id) {
				    name
				    city
				    fromPricePerNight
				    roomTypes { name maxAdults }
				  }
				}
				""", Map.of("id", fx.hotelId().toString()), null);
		assertThat(body.get("errors")).isNull();
		Map<String, Object> data = (Map<String, Object>) body.get("data");
		Map<String, Object> hotel = (Map<String, Object>) data.get("hotel");
		assertThat(hotel.get("name")).isEqualTo(fx.hotel().getName());
		assertThat(hotel.get("fromPricePerNight")).isEqualTo(1000);
		assertThat((List<?>) hotel.get("roomTypes")).isNotEmpty();
	}

	@Test
	void anonymousCanQuoteAndBook() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		LocalDate checkIn = LocalDate.now().plusDays(7);

		Map<String, Object> quote = post("""
				query($input: QuoteInput!) {
				  quote(input: $input) { totalAmount taxAmount valid }
				}
				""", Map.of("input", quoteInput(fx, checkIn)), null);
		assertThat(quote.get("errors")).isNull();
		Map<String, Object> quoteData = (Map<String, Object>) ((Map<String, Object>) quote.get("data"))
				.get("quote");
		assertThat(quoteData.get("valid")).isEqualTo(true);
		assertThat(((Number) quoteData.get("totalAmount")).doubleValue()).isEqualTo(3360.0);

		String idempotencyKey = "graphql-" + System.nanoTime();
		Map<String, Object> created = post("""
				mutation($input: CreateReservationInput!) {
				  createReservation(input: $input) {
				    created
				    reservation { reference status totalAmount }
				  }
				}
				""", Map.of("input", createInput(fx, checkIn, idempotencyKey)), null);
		assertThat(created.get("errors")).isNull();
		Map<String, Object> createdData = (Map<String, Object>) created.get("data");
		Map<String, Object> createResult = (Map<String, Object>) createdData.get("createReservation");
		assertThat(createResult.get("created")).isEqualTo(true);
		Map<String, Object> reservation = (Map<String, Object>) createResult.get("reservation");
		assertThat(reservation.get("status")).isEqualTo("confirmed");
		assertThat(((Number) reservation.get("totalAmount")).doubleValue()).isEqualTo(3360.0);
		String reference = (String) reservation.get("reference");

		Map<String, Object> lookedUp = post("""
				query($input: ReservationLookupInput!) {
				  reservation(input: $input) { reference totalAmount }
				}
				""", Map.of("input", Map.of("reference", reference, "email", "graphql@example.com")), null);
		assertThat(lookedUp.get("errors")).isNull();
		assertThat(((Map<String, Object>) ((Map<String, Object>) lookedUp.get("data")).get("reservation"))
				.get("reference")).isEqualTo(reference);

		Map<String, Object> duplicate = post("""
				mutation($input: CreateReservationInput!) {
				  createReservation(input: $input) { created }
				}
				""", Map.of("input", createInput(fx, checkIn, idempotencyKey)), null);
		assertThat(((Map<String, Object>) ((Map<String, Object>) duplicate.get("data"))
				.get("createReservation")).get("created")).isEqualTo(false);
	}

	@Test
	void meRequiresAuthentication() throws Exception {
		Map<String, Object> body = post("{ me { email } }", null, null);
		List<Map<String, Object>> errors = (List<Map<String, Object>>) body.get("errors");
		assertThat(errors).isNotEmpty();
		assertThat(errors.get(0).get("extensions"))
				.asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.MAP)
				.containsEntry("code", "UNAUTHORIZED");
	}

	@Test
	void loginAndRegisterWork() throws Exception {
		String email = "guest-" + System.nanoTime() + "@example.com";
		Map<String, Object> body = post("""
				mutation($input: RegisterInput!) {
				  register(input: $input) { token me { email } }
				}
				""", Map.of("input", Map.of(
						"firstName", "Zahra", "lastName", "Bennani",
						"email", email, "password", "secret123")), null);
		assertThat(body.get("errors")).isNull();
		Map<String, Object> register = (Map<String, Object>) ((Map<String, Object>) body.get("data"))
				.get("register");
		String token = (String) register.get("token");
		assertThat(token).isNotBlank();
		assertThat(((Map<String, Object>) register.get("me")).get("email")).isEqualTo(email);

		Map<String, Object> me = post("{ me { email roles } }", null, token);
		assertThat(((Map<String, Object>) ((Map<String, Object>) me.get("data")).get("me"))
				.get("email")).isEqualTo(email);
	}

	@Test
	void adminHotelIsHotelScoped() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		Map<String, Object> body = post("""
				query { adminHotel(hotelId: "%s") { name } }
				""".formatted(fx.hotelId()), null, null);
		List<Map<String, Object>> errors = (List<Map<String, Object>>) body.get("errors");
		assertThat(errors).isNotEmpty();
		Map<String, Object> extensions = (Map<String, Object>) errors.get(0).get("extensions");
		assertThat(extensions.get("code")).isIn("FORBIDDEN", "UNAUTHORIZED");
	}

	@Test
	void staffInHotelCanReadAdminQueries() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String token = jwtService.issue(new CurrentUser(uid(1),
				"staff@example.com", List.of("super_admin"), List.of(fx.hotelId()), java.time.Instant.now()));

		Map<String, Object> body = post("""
				query($hotelId: ID!) {
				  adminHotel(hotelId: $hotelId) { name roomTypes { name } }
				  adminReservations(hotelId: $hotelId) { total items { reference } }
				}
				""", Map.of("hotelId", fx.hotelId().toString()), token);
		assertThat(body.get("errors")).isNull();
		Map<String, Object> data = (Map<String, Object>) body.get("data");
		assertThat(((Map<String, Object>) data.get("adminHotel")).get("name"))
				.isEqualTo(fx.hotel().getName());
		Map<String, Object> reservations = (Map<String, Object>) data.get("adminReservations");
		assertThat(((Number) reservations.get("total")).intValue()).isEqualTo(0);
		assertThat((List<?>) reservations.get("items")).isEmpty();
	}

	@Test
	void staffOfAnotherHotelIsForbiddenFromAdminQueries() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		TestFixtures.HotelFixture other = fixtures.newBookableHotel();
		String token = jwtService.issue(new CurrentUser(uid(2),
				"staff@example.com", List.of(), List.of(other.hotelId()), java.time.Instant.now()));

		Map<String, Object> body = post("""
				query { adminHotel(hotelId: "%s") { name } }
				""".formatted(fx.hotelId()), null, token);
		assertThat(extensionsCode(body)).isEqualTo("FORBIDDEN");
	}

	@Test
	void anonymousPaymentRejected() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		Map<String, Object> created = book(fx, LocalDate.now().plusDays(7),
				"anon-pay-" + System.nanoTime(), null);
		Map<String, Object> body = post("""
				mutation($input: CreatePaymentInput!) { createPayment(input: $input) { id } }
				""", Map.of("input", payInput(created)), null);
		assertThat(extensionsCode(body)).isEqualTo("UNAUTHORIZED");
	}

	@Test
	void paymentRequiresOwnerOrStaff() throws Exception {
		String tokenA = register("owner-a-" + System.nanoTime() + "@example.com");
		String tokenB = register("owner-b-" + System.nanoTime() + "@example.com");
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		Map<String, Object> created = book(fx, LocalDate.now().plusDays(7),
				"owner-pay-" + System.nanoTime(), tokenA);

		Map<String, Object> payAsB = post("""
				mutation($input: CreatePaymentInput!) { createPayment(input: $input) { id } }
				""", Map.of("input", payInput(created)), tokenB);
		assertThat(extensionsCode(payAsB)).isEqualTo("FORBIDDEN");

		Map<String, Object> payAsOwner = post("""
				mutation($input: CreatePaymentInput!) { createPayment(input: $input) { id } }
				""", Map.of("input", payInput(created)), tokenA);
		assertThat(payAsOwner.get("errors")).isNull();
		String paymentId = (String) ((Map<String, Object>) ((Map<String, Object>) payAsOwner
				.get("data")).get("createPayment")).get("id");

		Map<String, Object> captureAsB = post("""
				mutation($input: CapturePaymentInput!) { capturePayment(input: $input) { id } }
				""", Map.of("input", Map.of("paymentId", paymentId)), tokenB);
		assertThat(extensionsCode(captureAsB)).isEqualTo("FORBIDDEN");

		Map<String, Object> captureAsOwner = post("""
				mutation($input: CapturePaymentInput!) { capturePayment(input: $input) { id } }
				""", Map.of("input", Map.of("paymentId", paymentId)), tokenA);
		assertThat(captureAsOwner.get("errors")).isNull();
	}

	@Test
	void anonymousCancelOfAccountBackedBookingRejected() throws Exception {
		String email = "cancel-owner-" + System.nanoTime() + "@example.com";
		String token = register(email);
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String reference = (String) ((Map<String, Object>) bookWithEmail(fx,
				LocalDate.now().plusDays(7), "cancel-bind-" + System.nanoTime(), email, token)
				.get("reservation")).get("reference");

		Map<String, Object> anonymous = post("""
				mutation($input: CancelReservationInput!) {
				  cancelReservation(input: $input) { reservation { status } }
				}
				""", Map.of("input", Map.of("reference", reference, "email", email)), null);
		assertThat(extensionsCode(anonymous)).isEqualTo("FORBIDDEN");

		Map<String, Object> asOwner = post("""
				mutation($input: CancelReservationInput!) {
				  cancelReservation(input: $input) { reservation { status } }
				}
				""", Map.of("input", Map.of("reference", reference, "email", email)), token);
		assertThat(asOwner.get("errors")).isNull();
		assertThat(((Map<String, Object>) ((Map<String, Object>) ((Map<String, Object>) asOwner
				.get("data")).get("cancelReservation")).get("reservation")).get("status"))
				.isEqualTo("cancelled");
	}

	@Test
	void registerDuplicateEmailDoesNotEnumerate() throws Exception {
		String email = "dup-" + System.nanoTime() + "@example.com";
		register(email);
		Map<String, Object> body = post("""
				mutation($input: RegisterInput!) { register(input: $input) { token } }
				""", Map.of("input", Map.of(
						"firstName", "Zahra", "lastName", "Bennani",
						"email", email, "password", "secret123")), null);
		List<Map<String, Object>> errors = (List<Map<String, Object>>) body.get("errors");
		assertThat(errors).isNotEmpty();
		assertThat((String) errors.get(0).get("message"))
				.contains("registration failed").doesNotContain(email);
		assertThat(extensionsCode(body)).isEqualTo("VALIDATION");
	}

	@Test
	void availabilityHonorsRequestedRooms() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		LocalDate checkIn = LocalDate.now().plusDays(5);
		Map<String, Object> input = new java.util.HashMap<>(Map.of(
				"hotelId", fx.hotelId().toString(),
				"checkInDate", checkIn.toString(),
				"checkOutDate", checkIn.plusDays(2).toString(),
				"adults", 2, "children", 0, "rooms", 3));

		Map<String, Object> body = post("""
				query($input: AvailabilityInput!) {
				  availability(input: $input) { roomTypeId status available }
				}
				""", Map.of("input", input), null);
		assertThat(body.get("errors")).isNull();
		List<Map<String, Object>> rows = (List<Map<String, Object>>) ((Map<String, Object>) body
				.get("data")).get("availability");
		assertThat(rows).isNotEmpty();
		assertThat(rows.get(0).get("status")).isEqualTo("available");
		assertThat(rows.get(0).get("available")).isEqualTo(true);

		input.put("rooms", 4);
		Map<String, Object> soldOut = post("""
				query($input: AvailabilityInput!) {
				  availability(input: $input) { roomTypeId status available }
				}
				""", Map.of("input", input), null);
		assertThat(soldOut.get("errors")).isNull();
		List<Map<String, Object>> soldOutRows = (List<Map<String, Object>>) ((Map<String, Object>) soldOut
				.get("data")).get("availability");
		assertThat(soldOutRows.get(0).get("status")).isEqualTo("soldout");
		assertThat(soldOutRows.get(0).get("available")).isEqualTo(false);
	}

	@Test
	void hotelsSortByRatingDesc() throws Exception {
		TestFixtures.HotelFixture fx1 = fixtures.newBookableHotel();
		TestFixtures.HotelFixture fx2 = fixtures.newBookableHotel();
		seedReview(fx1.hotelId(), (short) 5);
		seedReview(fx1.hotelId(), (short) 5);
		seedReview(fx2.hotelId(), (short) 1);

		Map<String, Object> body = post("""
				query($input: HotelSearchInput) { hotels(input: $input) { items { id } } }
				""", Map.of("input", Map.of("sort", "RATING_DESC",
						"page", Map.of("page", 0, "size", 10))), null);
		assertThat(body.get("errors")).isNull();
		List<Map<String, Object>> items = (List<Map<String, Object>>) ((Map<String, Object>) (
				(Map<String, Object>) body.get("data")).get("hotels")).get("items");
		assertThat(items.get(0).get("id")).isEqualTo(fx1.hotelId().toString());
		assertThat(items.get(1).get("id")).isEqualTo(fx2.hotelId().toString());
	}

	@Test
	void hotelTimesSerializeAsPlainStrings() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		fx.hotel().setCheckInTime(java.time.LocalTime.of(12, 0));
		hotelRepository.save(fx.hotel());

		Map<String, Object> body = post("""
				query($id: ID!) { hotel(id: $id) { checkInTime checkOutTime } }
				""", Map.of("id", fx.hotelId().toString()), null);
		assertThat(body.get("errors")).isNull();
		Map<String, Object> hotel = (Map<String, Object>) ((Map<String, Object>) body.get("data"))
				.get("hotel");
		assertThat(hotel.get("checkInTime")).isEqualTo("12:00");
		assertThat(hotel.get("checkOutTime")).isNull();
	}

	@Test
	void issueInvoiceMutationIsIdempotent() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		Map<String, Object> created = book(fx, LocalDate.now().plusDays(7),
				"invoice-" + System.nanoTime(), null);
		String reference = (String) ((Map<String, Object>) created.get("reservation"))
				.get("reference");
		Map<String, Object> variables = Map.of("input",
				Map.of("reference", reference, "email", "graphql@example.com"));

		Map<String, Object> body = post("""
				mutation($input: ReservationLookupInput!) {
				  issueInvoice(input: $input) { invoiceNumber }
				}
				""", variables, null);
		assertThat(body.get("errors")).isNull();
		assertThat(((Map<String, Object>) ((Map<String, Object>) body.get("data"))
				.get("issueInvoice")).get("invoiceNumber")).isEqualTo("INV-" + reference);

		Map<String, Object> again = post("""
				mutation($input: ReservationLookupInput!) {
				  issueInvoice(input: $input) { invoiceNumber }
				}
				""", variables, null);
		assertThat(again.get("errors")).isNull();
		assertThat(((Map<String, Object>) ((Map<String, Object>) again.get("data"))
				.get("issueInvoice")).get("invoiceNumber")).isEqualTo("INV-" + reference);
	}

	@Test
	void publicCatalogQueriesAndReviewRoundTrip() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String hotelId = fx.hotelId().toString();
		seedExperience(fx.hotelId());
		seedRestaurant(fx.hotelId());
		seedExtra(fx.hotelId());
		seedFaq(fx.hotelId());
		String promoCode = "OFFER-" + System.nanoTime();
		seedPromotion(fx.hotelId(), promoCode);

		Map<String, Object> offers = post("""
				query($hotelId: ID!) { offers(hotelId: $hotelId) { code discountType discountValue } }
				""", Map.of("hotelId", hotelId), null);
		assertThat(offers.get("errors")).isNull();
		List<Map<String, Object>> offerList = (List<Map<String, Object>>) ((Map<String, Object>)
				offers.get("data")).get("offers");
		assertThat(offerList).hasSize(1);
		assertThat(offerList.get(0).get("code")).isEqualTo(promoCode);

		Map<String, Object> rates = post("""
				query($input: RatesInput!) {
				  rates(input: $input) { ratePlanCode ratePlanName pricePerNight currencyCode }
				}
				""", Map.of("input", Map.of("hotelId", hotelId,
						"checkInDate", LocalDate.now().plusDays(5).toString(),
						"checkOutDate", LocalDate.now().plusDays(8).toString(),
						"adults", 2, "children", 0)), null);
		assertThat(rates.get("errors")).isNull();
		List<Map<String, Object>> options = (List<Map<String, Object>>) ((Map<String, Object>)
				rates.get("data")).get("rates");
		assertThat(options).hasSize(1);
		assertThat(options.get(0).get("ratePlanCode")).isEqualTo("bb");
		assertThat(((Number) options.get(0).get("pricePerNight")).doubleValue()).isEqualTo(1000.0);

		Map<String, Object> details = post("""
				query($id: ID!) {
				  hotelDetails(id: $id) {
				    hotel { name }
				    experiences { name }
				    restaurants { name }
				    faqs { question }
				    reviewsCount
				  }
				}
				""", Map.of("id", hotelId), null);
		assertThat(details.get("errors")).isNull();
		Map<String, Object> detail = (Map<String, Object>) ((Map<String, Object>) details.get("data"))
				.get("hotelDetails");
		assertThat(detail.get("hotel")).isNotNull();
		assertThat((List<?>) detail.get("experiences")).hasSize(1);
		assertThat((List<?>) detail.get("restaurants")).hasSize(1);
		assertThat((List<?>) detail.get("faqs")).hasSize(1);
		assertThat(((Number) detail.get("reviewsCount")).intValue()).isEqualTo(0);

		Map<String, Object> experiences = post("""
				query($hotelId: ID!) { experiences(hotelId: $hotelId) { name category } }
				""", Map.of("hotelId", hotelId), null);
		assertThat(experiences.get("errors")).isNull();
		assertThat((List<?>) ((Map<String, Object>) experiences.get("data"))
				.get("experiences")).hasSize(1);

		Map<String, Object> restaurants = post("""
				query($hotelId: ID!) { restaurants(hotelId: $hotelId) { name cuisineType } }
				""", Map.of("hotelId", hotelId), null);
		assertThat(restaurants.get("errors")).isNull();
		assertThat((List<?>) ((Map<String, Object>) restaurants.get("data"))
				.get("restaurants")).hasSize(1);

		Map<String, Object> extras = post("""
				query($hotelId: ID!) { extras(hotelId: $hotelId) { name pricingModel } }
				""", Map.of("hotelId", hotelId), null);
		assertThat(extras.get("errors")).isNull();
		assertThat((List<?>) ((Map<String, Object>) extras.get("data")).get("extras")).hasSize(1);

		Map<String, Object> faqs = post("""
				query($hotelId: ID!) { faqs(hotelId: $hotelId) { question answer } }
				""", Map.of("hotelId", hotelId), null);
		assertThat(faqs.get("errors")).isNull();
		assertThat((List<?>) ((Map<String, Object>) faqs.get("data")).get("faqs")).hasSize(1);

		seedReview(fx.hotelId(), (short) 5);
		Map<String, Object> reviews = post("""
				query($hotelId: ID!, $page: PageInput) {
				  reviews(hotelId: $hotelId, page: $page) { total items { rating } }
				}
				""", Map.of("hotelId", hotelId, "page", Map.of("page", 0, "size", 10)), null);
		assertThat(reviews.get("errors")).isNull();
		Map<String, Object> reviewPage = (Map<String, Object>) ((Map<String, Object>) reviews
				.get("data")).get("reviews");
		assertThat(((Number) reviewPage.get("total")).intValue()).isEqualTo(1);

		String email = "reviewer-" + System.nanoTime() + "@example.com";
		Map<String, Object> reg = post("""
				mutation($input: RegisterInput!) { register(input: $input) { token me { id } } }
				""", Map.of("input", Map.of("firstName", "Rania", "lastName", "Idrissi",
						"email", email, "password", "secret123")), null);
		assertThat(reg.get("errors")).isNull();
		Map<String, Object> payload = (Map<String, Object>) ((Map<String, Object>) reg.get("data"))
				.get("register");
		String token = (String) payload.get("token");
		UUID userId = UUID.fromString((String) ((Map<String, Object>) payload.get("me")).get("id"));
		seedCompletedStay(fx.hotelId(), userId);

		Map<String, Object> created = post("""
				mutation($input: CreateReviewInput!) {
				  createReview(input: $input) { rating title comment moderationStatus }
				}
				""", Map.of("input", Map.of("hotelId", hotelId, "rating", 4,
						"title", "Lovely stay", "comment", "Great hospitality")), token);
		assertThat(created.get("errors")).isNull();
		Map<String, Object> review = (Map<String, Object>) ((Map<String, Object>) created.get("data"))
				.get("createReview");
		assertThat(review.get("rating")).isEqualTo(4);
		assertThat(review.get("moderationStatus")).isEqualTo("pending");

		Map<String, Object> duplicate = post("""
				mutation($input: CreateReviewInput!) {
				  createReview(input: $input) { id }
				}
				""", Map.of("input", Map.of("hotelId", hotelId, "rating", 2)), token);
		assertThat(extensionsCode(duplicate)).isEqualTo("CONFLICT");
	}

	private Map<String, Object> book(TestFixtures.HotelFixture fx, LocalDate checkIn, String key,
			String token) throws Exception {
		return bookWithEmail(fx, checkIn, key, "graphql@example.com", token);
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
				""", Map.of("input", createInput(fx, checkIn, key, email)), token);
		assertThat(created.get("errors")).isNull();
		return (Map<String, Object>) ((Map<String, Object>) created.get("data"))
				.get("createReservation");
	}

	private Map<String, Object> payInput(Map<String, Object> created) {
		String reservationId = (String) ((Map<String, Object>) created.get("reservation"))
				.get("id");
		return Map.of("reservationId", reservationId, "amount", 3360.0,
				"currencyCode", TestFixtures.CURRENCY, "provider", "mock");
	}

	private String register(String email) throws Exception {
		Map<String, Object> body = post("""
				mutation($input: RegisterInput!) { register(input: $input) { token } }
				""", Map.of("input", Map.of(
						"firstName", "Zahra", "lastName", "Bennani",
						"email", email, "password", "secret123")), null);
		assertThat(body.get("errors")).isNull();
		return (String) ((Map<String, Object>) ((Map<String, Object>) body.get("data"))
				.get("register")).get("token");
	}

	private void seedReview(UUID hotelId, short rating) {
		com.hotelcollection.hotel.entity.Review r = new com.hotelcollection.hotel.entity.Review();
		r.setHotelId(hotelId);
		r.setRating(rating);
		r.setModerationStatus(com.hotelcollection.hotel.entity.ReviewModerationStatus.approved);
		r.setAuthorName("Tester");
		r.setCreatedAt(java.time.Instant.now());
		r.setUpdatedAt(java.time.Instant.now());
		reviewRepository.save(r);
	}

	private void seedExperience(UUID hotelId) {
		com.hotelcollection.hotel.entity.Experience e = new com.hotelcollection.hotel.entity.Experience();
		e.setHotelId(hotelId);
		e.setName("Sahara Sunset Tour");
		e.setCategory("tour");
		e.setStatus("active");
		e.setSortOrder((short) 1);
		e.setCreatedAt(java.time.Instant.now());
		e.setUpdatedAt(java.time.Instant.now());
		experienceRepository.save(e);
	}

	private void seedRestaurant(UUID hotelId) {
		com.hotelcollection.hotel.entity.Restaurant r = new com.hotelcollection.hotel.entity.Restaurant();
		r.setHotelId(hotelId);
		r.setName("Rooftop Grill");
		r.setCuisineType("Moroccan");
		r.setStatus("active");
		r.setSortOrder((short) 1);
		r.setCreatedAt(java.time.Instant.now());
		r.setUpdatedAt(java.time.Instant.now());
		restaurantRepository.save(r);
	}

	private void seedExtra(UUID hotelId) {
		com.hotelcollection.hotel.entity.Extra x = new com.hotelcollection.hotel.entity.Extra();
		x.setHotelId(hotelId);
		x.setName("Airport Transfer");
		x.setPricingModel(com.hotelcollection.hotel.entity.ExtraPricingModel.per_stay);
		x.setPriceAmount(new java.math.BigDecimal("150.00"));
		x.setCurrencyCode(TestFixtures.CURRENCY);
		x.setStatus("active");
		x.setCreatedAt(java.time.Instant.now());
		x.setUpdatedAt(java.time.Instant.now());
		extraRepository.save(x);
	}

	private void seedFaq(UUID hotelId) {
		com.hotelcollection.hotel.entity.Faq f = new com.hotelcollection.hotel.entity.Faq();
		f.setHotelId(hotelId);
		f.setQuestion("What time is check-in?");
		f.setAnswer("From 2 PM.");
		f.setStatus("active");
		f.setCreatedAt(java.time.Instant.now());
		f.setUpdatedAt(java.time.Instant.now());
		f.setSortOrder((short) 1);
		faqRepository.save(f);
	}

	private void seedPromotion(UUID hotelId, String code) {
		com.hotelcollection.hotel.entity.Promotion p = new com.hotelcollection.hotel.entity.Promotion();
		p.setHotelId(hotelId);
		p.setCode(code);
		p.setName("Spring Break");
		p.setDiscountType(com.hotelcollection.hotel.entity.PromotionDiscountType.percentage);
		p.setDiscountValue(new java.math.BigDecimal("15.00"));
		p.setStackable(false);
		p.setStatus("active");
		p.setCreatedAt(java.time.Instant.now());
		p.setUpdatedAt(java.time.Instant.now());
		promotionRepository.save(p);
	}

	private void seedCompletedStay(UUID hotelId, UUID userId) {
		com.hotelcollection.hotel.entity.Guest guest = guestRepository.findByUserId(userId)
				.orElseThrow();
		com.hotelcollection.hotel.entity.Reservation r = new com.hotelcollection.hotel.entity.Reservation();
		r.setReference("RC-" + (100000 + System.nanoTime() % 900000));
		r.setHotelId(hotelId);
		r.setGuestId(guest.getId());
		r.setBookedByUserId(userId);
		r.setStatus(com.hotelcollection.hotel.entity.ReservationStatus.checked_out);
		r.setCheckInDate(LocalDate.now().minusDays(10));
		r.setCheckOutDate(LocalDate.now().minusDays(7));
		r.setAdults((short) 2);
		r.setChildren((short) 0);
		r.setCurrencyCode(TestFixtures.CURRENCY);
		r.setSubtotalAmount(new java.math.BigDecimal("1000.00"));
		r.setDiscountAmount(new java.math.BigDecimal("0.00"));
		r.setTaxAmount(new java.math.BigDecimal("0.00"));
		r.setFeeAmount(new java.math.BigDecimal("0.00"));
		r.setTotalAmount(new java.math.BigDecimal("1000.00"));
		r.setSource("direct");
		r.setPaymentStatus(com.hotelcollection.hotel.entity.PaymentStatus.captured);
		r.setCreatedAt(java.time.Instant.now());
		r.setUpdatedAt(java.time.Instant.now());
		reservationRepository.save(r);
	}

	private String extensionsCode(Map<String, Object> body) {
		List<Map<String, Object>> errors = (List<Map<String, Object>>) body.get("errors");
		assertThat(errors).isNotEmpty();
		Map<String, Object> extensions = (Map<String, Object>) errors.get(0).get("extensions");
		return (String) extensions.get("code");
	}

	private Map<String, Object> quoteInput(TestFixtures.HotelFixture fx, LocalDate checkIn) {
		return Map.of(
				"hotelId", fx.hotelId().toString(),
				"checkInDate", checkIn.toString(),
				"checkOutDate", checkIn.plusDays(3).toString(),
				"adults", 2,
				"children", 0,
				"currencyCode", TestFixtures.CURRENCY,
				"rooms", List.of(Map.of(
						"roomTypeId", fx.roomType().getId().toString(),
						"ratePlanId", fx.ratePlan().getId().toString())));
	}

	private Map<String, Object> createInput(TestFixtures.HotelFixture fx, LocalDate checkIn,
			String key) {
		return createInput(fx, checkIn, key, "graphql@example.com");
	}

	private Map<String, Object> createInput(TestFixtures.HotelFixture fx, LocalDate checkIn,
			String key, String email) {
		return Map.of(
				"hotelId", fx.hotelId().toString(),
				"checkInDate", checkIn.toString(),
				"checkOutDate", checkIn.plusDays(3).toString(),
				"adults", 2,
				"children", 0,
				"currencyCode", TestFixtures.CURRENCY,
				"guest", Map.of(
						"firstName", "Graph", "lastName", "Ql", "email", email),
				"rooms", List.of(Map.of(
						"roomTypeId", fx.roomType().getId().toString(),
						"ratePlanId", fx.ratePlan().getId().toString())),
				"idempotencyKey", key);
	}
}
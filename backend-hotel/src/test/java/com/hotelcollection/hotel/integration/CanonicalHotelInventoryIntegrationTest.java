package com.hotelcollection.hotel.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.kafka.KafkaContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelcollection.hotel.dto.availability.AvailabilityInput;
import com.hotelcollection.hotel.dto.availability.RoomAvailability;
import com.hotelcollection.hotel.dto.reservation.CancelReservationInput;
import com.hotelcollection.hotel.dto.reservation.CreateReservationInput;
import com.hotelcollection.hotel.dto.reservation.CreateResult;
import com.hotelcollection.hotel.dto.reservation.GuestInput;
import com.hotelcollection.hotel.dto.reservation.RoomInput;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.entity.Room;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.exception.ErrorCode;
import com.hotelcollection.hotel.repository.RoomRepository;
import com.hotelcollection.hotel.repository.RoomTypeRepository;
import com.hotelcollection.hotel.service.AvailabilityService;
import com.hotelcollection.hotel.service.BookingService;
import com.hotelcollection.hotel.service.CatalogQueryService;

/**
 * CANONICAL INVENTORY MODEL — physical-room inventory + reservation-driven
 * availability.
 *
 * Inventory source of truth: the count of ACTIVE physical rooms of a room
 * type (room_types.total_inventory is trigger-derived, V26). Availability
 * for a stay = physical rooms − conflicting reservations/allocations per
 * night (sparse availability rows sold by bookings, released on cancel).
 *
 * Uses its OWN containers (not the shared TestcontainersConfiguration) so
 * the "exactly one active hotel" invariants hold on a clean database.
 *
 * Covers: canonicalHotel contract, physical-room-derived capacity, one
 * reservation consuming exactly one unit, partial availability, full
 * sell-out with overbooking rejected, date-range isolation, cancellation
 * releasing inventory, and the last-unit race.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CanonicalHotelInventoryIntegrationTest {

	static final PostgreSQLContainer PG = new PostgreSQLContainer(
			DockerImageName.parse("postgres:16.4-alpine"));
	static final KafkaContainer KAFKA = new KafkaContainer(
			DockerImageName.parse("apache/kafka-native:3.9.1"))
			.withStartupTimeout(java.time.Duration.ofMinutes(3));
	static {
		PG.start();
		KAFKA.start();
	}

	@DynamicPropertySource
	static void datasource(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", PG::getJdbcUrl);
		registry.add("spring.datasource.username", PG::getUsername);
		registry.add("spring.datasource.password", PG::getPassword);
		registry.add("spring.kafka.bootstrap-servers", KAFKA::getBootstrapServers);
	}

	private static UUID uid(long n) { return new UUID(0, n); }

	@LocalServerPort
	int port;

	@Autowired
	TestFixtures fixtures;
	@Autowired
	AvailabilityService availability;
	@Autowired
	BookingService booking;
	@Autowired
	CatalogQueryService catalog;
	@Autowired
	RoomTypeRepository roomTypeRepository;
	@Autowired
	RoomRepository roomRepository;

	private static final String EMAIL = "canonical@example.com";
	private static final String EMAIL2 = "canonical2@example.com";

	@org.springframework.beans.factory.annotation.Autowired
	org.springframework.jdbc.core.JdbcTemplate jdbc;

	/**
	 * The canonical invariants ("exactly one active hotel") hold only on a
	 * clean database — this class owns its containers, so reset the catalog
	 * before every test.
	 */
	@org.junit.jupiter.api.BeforeEach
	void cleanCatalog() {
		jdbc.update("TRUNCATE hotels CASCADE");
	}

	private CreateReservationInput input(TestFixtures.HotelFixture fx, String key,
			LocalDate checkIn, int nights, String email) {
		return new CreateReservationInput(fx.hotelId(), checkIn, checkIn.plusDays(nights), 2, 0,
				TestFixtures.CURRENCY,
				new GuestInput("Canon", "Guest", email, "+212600000000", "MA"),
				List.of(new RoomInput(fx.roomType().getId(), fx.ratePlan().getId())),
				List.of(), null, key, null, null);
	}

	// ---------------------------------------------------------------- canonical hotel

	@Test
	void canonicalHotelIsTheSingleActiveHotel() throws Exception {
		// zero active hotels → NOT_FOUND
		Map<String, Object> none = post("""
				query { canonicalHotel { id name status } }
				""");
		assertThat(extensionsCode(none)).isEqualTo("NOT_FOUND");

		// one active hotel → returned, and it is ACTIVE
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		Map<String, Object> one = post("""
				query { canonicalHotel { id name status } }
				""");
		assertThat(one.get("errors")).isNull();
		Map<String, Object> hotel = (Map<String, Object>) ((Map<String, Object>) one.get("data"))
				.get("canonicalHotel");
		assertThat(hotel.get("id")).isEqualTo(fx.hotelId().toString());
		assertThat(hotel.get("status")).isEqualTo("active");

		// a second active hotel → CONFLICT (single-property platform)
		fixtures.newBookableHotel();
		Map<String, Object> two = post("""
				query { canonicalHotel { id } }
				""");
		assertThat(extensionsCode(two)).isEqualTo("CONFLICT");
	}

	@Test
	void staySearchWithoutHotelIdTargetsTheCanonicalHotel() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		LocalDate checkIn = LocalDate.now().plusDays(5);
		Map<String, Object> body = post("""
				query($input: StaySearchInput!) {
				  staySearch(input: $input) { hotelId hotelName status }
				}
				""", Map.of("input", Map.of(
						"checkInDate", checkIn.toString(),
						"checkOutDate", checkIn.plusDays(2).toString(),
						"adults", 2, "children", 0, "rooms", 1)));
		assertThat(body.get("errors")).isNull();
		List<Map<String, Object>> rows = (List<Map<String, Object>>) ((Map<String, Object>) body
				.get("data")).get("staySearch");
		assertThat(rows).isNotEmpty();
		assertThat(rows).allSatisfy(r -> {
			assertThat(r.get("hotelId")).isEqualTo(fx.hotelId().toString());
			assertThat(r.get("status")).isEqualTo("available");
		});
	}

	// ---------------------------------------------------------------- physical inventory

	@Test
	void roomTypeInventoryEqualsItsActivePhysicalRooms() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel("3 rooms", 3);
		RoomType db = roomTypeRepository.findById(fx.roomType().getId()).orElseThrow();
		assertThat(db.getTotalInventory()).isEqualTo(3);

		// adding a room raises derived inventory; deactivating lowers it
		Room extra = new Room();
		extra.setHotelId(fx.hotelId());
		extra.setRoomTypeId(fx.roomType().getId());
		extra.setRoomNumber("777");
		extra.setFloor("7");
		extra.setStatus("active");
		extra.setHousekeepingStatus("clean");
		extra.setMaintenanceStatus("ok");
		extra.setCreatedAt(java.time.Instant.now());
		extra.setUpdatedAt(java.time.Instant.now());
		roomRepository.save(extra);
		assertThat(roomTypeRepository.findById(fx.roomType().getId()).orElseThrow()
				.getTotalInventory()).isEqualTo(4);

		extra.setStatus("inactive");
		roomRepository.save(extra);
		assertThat(roomTypeRepository.findById(fx.roomType().getId()).orElseThrow()
				.getTotalInventory()).isEqualTo(3);
	}

	// ---------------------------------------------------------------- availability

	private RoomAvailability availabilityOf(TestFixtures.HotelFixture fx, LocalDate checkIn,
			int nights, int rooms) {
		return availability.check(new AvailabilityInput(fx.hotelId(), checkIn,
				checkIn.plusDays(nights), 2, 0, rooms)).get(0);
	}

	@Test
	void availabilityIsPhysicalRoomsMinusReservations() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel("4 rooms", 4);
		LocalDate checkIn = LocalDate.now().plusDays(10);

		// idle: all 4 physical rooms free
		RoomAvailability fresh = availabilityOf(fx, checkIn, 2, 1);
		assertThat(fresh.free()).isEqualTo(4);
		assertThat(fresh.status()).isEqualTo(com.hotelcollection.hotel.dto.availability.AvailabilityStatus.available);

		// one reservation consumes exactly ONE physical room for those nights
		booking.create(input(fx, "inv-1-" + System.nanoTime(), checkIn, 2, EMAIL));
		assertThat(availabilityOf(fx, checkIn, 2, 1).free()).isEqualTo(3);
		assertThat(availabilityOf(fx, checkIn, 2, 1).status())
				.isEqualTo(com.hotelcollection.hotel.dto.availability.AvailabilityStatus.available);

		// two reservations → 2 of 4 left → "few" (a 4-room type IS large
		// enough for the scarcity label)
		booking.create(input(fx, "inv-2-" + System.nanoTime(), checkIn, 2, EMAIL2));
		assertThat(availabilityOf(fx, checkIn, 2, 1).free()).isEqualTo(2);
		assertThat(availabilityOf(fx, checkIn, 2, 1).status())
				.isEqualTo(com.hotelcollection.hotel.dto.availability.AvailabilityStatus.few);

		// partial availability: the room type stays available while any room remains
		assertThat(availabilityOf(fx, checkIn, 2, 1).available()).isTrue();
	}

	@Test
	void smallRoomTypeIsNeverLabelledFewAtFullAvailability() {
		// a 2-room type at full availability is "available", not "few rooms
		// left" — an untouched room type is never scarce, however small it is.
		// Once one of the two sells, the remaining unit does read as "few".
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel("2 rooms", 2);
		LocalDate checkIn = LocalDate.now().plusDays(11);
		RoomAvailability full = availabilityOf(fx, checkIn, 2, 1);
		assertThat(full.free()).isEqualTo(2);
		assertThat(full.status())
				.isEqualTo(com.hotelcollection.hotel.dto.availability.AvailabilityStatus.available);

		// one of two booked → 1 free, and that last unit IS scarce: the label
		// keys off units actually sold, not the size of the room type, so a
		// nearly-full 2-room type no longer looks identical to an empty one.
		booking.create(input(fx, "small-1-" + System.nanoTime(), checkIn, 2, EMAIL));
		assertThat(availabilityOf(fx, checkIn, 2, 1).free()).isEqualTo(1);
		assertThat(availabilityOf(fx, checkIn, 2, 1).status())
				.isEqualTo(com.hotelcollection.hotel.dto.availability.AvailabilityStatus.few);

		// both booked → sold out
		booking.create(input(fx, "small-2-" + System.nanoTime(), checkIn, 2, EMAIL2));
		assertThat(availabilityOf(fx, checkIn, 2, 1).status())
				.isEqualTo(com.hotelcollection.hotel.dto.availability.AvailabilityStatus.soldout);
	}

	@Test
	void fullyBookedRoomTypeBecomesSoldOutAndOverbookingIsRejected() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel("4 rooms", 4);
		LocalDate checkIn = LocalDate.now().plusDays(12);
		for (int i = 1; i <= 4; i++) {
			booking.create(input(fx, "full-" + i + "-" + System.nanoTime(), checkIn, 2, EMAIL));
		}

		RoomAvailability full = availabilityOf(fx, checkIn, 2, 1);
		assertThat(full.free()).isZero();
		assertThat(full.available()).isFalse();
		assertThat(full.status()).isEqualTo(com.hotelcollection.hotel.dto.availability.AvailabilityStatus.soldout);

		// the 5th reservation for the same nights must conflict
		assertThatThrownBy(() -> booking.create(
				input(fx, "full-5-" + System.nanoTime(), checkIn, 2, EMAIL)))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.CONFLICT);

		// requesting 2 rooms with 1 free also conflicts
		assertThat(availabilityOf(fx, checkIn, 2, 2).status())
				.isEqualTo(com.hotelcollection.hotel.dto.availability.AvailabilityStatus.soldout);
	}

	@Test
	void reservationsForOtherDatesDoNotBlockTheStay() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel("3 rooms", 3);
		LocalDate first = LocalDate.now().plusDays(20);

		// reservation occupies nights [first, first+2)
		booking.create(input(fx, "dates-a-" + System.nanoTime(), first, 2, EMAIL));

		// check-out day itself is free: [first+2, first+4) is not blocked
		assertThat(availabilityOf(fx, first.plusDays(2), 2, 1).free()).isEqualTo(3);

		// a later, disjoint stay is untouched
		assertThat(availabilityOf(fx, first.plusDays(10), 2, 1).free()).isEqualTo(3);

		// a partial overlap on night 1 IS blocked
		assertThat(availabilityOf(fx, first.plusDays(1), 2, 1).free()).isEqualTo(2);
		assertThat(availabilityOf(fx, first.minusDays(1), 2, 1).free()).isEqualTo(2);
	}

	@Test
	void cancellationReleasesTheConsumedInventory() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel("3 rooms", 3);
		LocalDate checkIn = LocalDate.now().plusDays(15);
		CreateResult created = booking.create(input(fx, "release-" + System.nanoTime(), checkIn, 2, EMAIL));
		assertThat(availabilityOf(fx, checkIn, 2, 1).free()).isEqualTo(2);

		booking.cancel(new CancelReservationInput(created.reservation().getReference(), EMAIL,
				"guest_changed_plans", null));
		assertThat(availabilityOf(fx, checkIn, 2, 1).free()).isEqualTo(3);
	}

	// ---------------------------------------------------------------- concurrency

	@Test
	void concurrentBookingsCannotDoubleBookTheLastRoom() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel("2 rooms", 2);
		LocalDate checkIn = LocalDate.now().plusDays(30);

		// occupy one of the two rooms, then race two bookings for the last one
		booking.create(input(fx, "race-seed-" + System.nanoTime(), checkIn, 2, EMAIL));

		ExecutorService pool = Executors.newFixedThreadPool(2);
		CountDownLatch ready = new CountDownLatch(2);
		CountDownLatch go = new CountDownLatch(1);
		Callable<ErrorCode> attempt = () -> {
			ready.countDown();
			go.await();
			try {
				booking.create(input(fx, "race-" + System.nanoTime(), checkIn, 2, EMAIL2));
				return null;
			} catch (DomainException ex) {
				return ex.getCode();
			}
		};
		try {
			Future<ErrorCode> a = pool.submit(attempt);
			Future<ErrorCode> b = pool.submit(attempt);
			ready.await();
			go.countDown();
			ErrorCode ra = a.get();
			ErrorCode rb = b.get();
			// exactly one may win; the loser must surface CONFLICT
			assertThat(java.util.Arrays.asList(ra, rb)).contains(ErrorCode.CONFLICT);
			assertThat(java.util.Arrays.asList(ra, rb)).containsNull();
		} finally {
			pool.shutdownNow();
		}
		assertThat(availabilityOf(fx, checkIn, 2, 1).free()).isZero();
	}

	@Test
	void createReservationResolvesItsGuestInTheSameResponse() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		LocalDate checkIn = LocalDate.now().plusDays(7);
		// the guest frontend selects Reservation.guest in the create flow;
		// a freshly created entity must resolve it (read-only mapping — see
		// BookingServiceImpl.create). The write is REST (POST /api/v1/reservations).
		String key = "guest-resolve-" + System.nanoTime();
		HttpRequest req = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + "/api/v1/reservations"))
				.header("content-type", "application/json")
				.header("Idempotency-Key", key)
				.POST(HttpRequest.BodyPublishers.ofString(new ObjectMapper().writeValueAsString(
						Map.of(
								"hotelId", fx.hotelId().toString(),
								"checkInDate", checkIn.toString(),
								"checkOutDate", checkIn.plusDays(2).toString(),
								"adults", 2, "children", 0,
								"currencyCode", TestFixtures.CURRENCY,
								"guest", Map.of("firstName", "Greta", "lastName", "Graph",
										"email", "greta.graph@example.com"),
								"rooms", List.of(Map.of("roomTypeId",
										fx.roomType().getId().toString(),
										"ratePlanId", fx.ratePlan().getId().toString())),
								"idempotencyKey", key))))
				.build();
		HttpResponse<String> res = HttpClient.newHttpClient().send(req,
				HttpResponse.BodyHandlers.ofString());
		assertThat(res.statusCode()).isEqualTo(201);
		Map<String, Object> reservation = new ObjectMapper().readValue(res.body(), Map.class);
		assertThat(reservation.get("reference")).isNotNull();
		Map<String, Object> guest = (Map<String, Object>) reservation.get("guest");
		assertThat(guest).isNotNull();
		assertThat(guest.get("firstName")).isEqualTo("Greta");
		assertThat(guest.get("email")).isEqualTo("greta.graph@example.com");
		assertThat((List<?>) reservation.get("roomLines")).hasSize(1);
	}

	// ---------------------------------------------------------------- transport

	private Map<String, Object> post(String query) throws Exception {
		return post(query, Map.of());
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> post(String query, Map<String, Object> variables) throws Exception {
		HttpRequest req = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + "/graphql"))
				.header("content-type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString(
						new ObjectMapper().writeValueAsString(Map.of("query", query, "variables", variables))))
				.build();
		HttpResponse<String> res = HttpClient.newHttpClient().send(req,
				HttpResponse.BodyHandlers.ofString());
		return new ObjectMapper().readValue(res.body(), Map.class);
	}

	private String extensionsCode(Map<String, Object> body) {
		List<Map<String, Object>> errors = (List<Map<String, Object>>) body.get("errors");
		if (errors == null || errors.isEmpty()) {
			return null;
		}
		Map<String, Object> ext = (Map<String, Object>) errors.get(0).get("extensions");
		return ext == null ? null : (String) ext.get("code");
	}
}

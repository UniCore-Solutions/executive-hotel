package com.hotelcollection.hotel.integration;
import com.hotelcollection.hotel.entity.Hotel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import com.hotelcollection.hotel.entity.RatePlanPrice;
import com.hotelcollection.hotel.entity.TaxFeeType;

/**
 * Database-foundation integration tests: Flyway migrations on a real
 * PostgreSQL (Testcontainers) and the key DB-level integrity rules.
 * Each test is transactional and rolls back its fixture data; fixture rows
 * use UUID primary keys (gen_random_uuid) so tests stay deterministic.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@Transactional
class DatabaseIntegrityIntegrationTest {

	@Autowired
	JdbcTemplate jdbc;

	private UUID hotel1;
	private UUID hotel2;
	private UUID roomType1;
	private UUID roomType2;
	private UUID roomType3;
	private UUID platformId;
	private UUID userId;
	private UUID guestId;
	private UUID reservationId;

	// ---------- Flyway ----------

	@Test
	void flywayAppliedAllMigrations() {
		Integer applied = jdbc.queryForObject(
				"SELECT count(*) FROM flyway_schema_history WHERE success = TRUE", Integer.class);
		assertThat(applied).isEqualTo(20);
	}

	@Test
	void databaseContainsExpectedTablesAndExtensions() {
		Integer tables = jdbc.queryForObject(
				"SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
						+ " AND table_name <> 'flyway_schema_history'",
				Integer.class);
		assertThat(tables).isEqualTo(53);

		assertThat(extensionInstalled("btree_gist")).isTrue();
		assertThat(extensionInstalled("pgcrypto")).isTrue();
	}

	private boolean extensionInstalled(String name) {
		return Boolean.TRUE.equals(jdbc.queryForObject(
				"SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = ?)", Boolean.class, name));
	}

	// ---------- C1: cross-hotel isolation ----------

	@Test
	void roomCannotUseRoomTypeOfAnotherHotel() {
		fixture();
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO rooms(hotel_id, room_type_id, room_number) VALUES (?, ?, '101')",
				hotel1, roomType3))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void junctionCannotPairRoomTypeAndRatePlanOfDifferentHotels() {
		fixture();
		UUID ratePlan1 = insertRatePlan(hotel1, "BB", "BB");
		UUID ratePlan2 = insertRatePlan(hotel2, "BB2", "BB2");
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO room_type_rate_plans(hotel_id, room_type_id, rate_plan_id, currency_code) VALUES (?, ?, ?, 'MAD')",
				hotel1, roomType3, ratePlan2))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void reservationExtraHotelIsPinnedToReservationHotel() {
		fixture();
		bookingFixture();
		jdbc.update("INSERT INTO extras (id, hotel_id, name, pricing_model, price_amount, currency_code)"
				+ " VALUES (gen_random_uuid(), ?, 'Spa', 'per_stay', 50, 'MAD')", hotel2);
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO reservation_extras(reservation_id, hotel_id, extra_id, quantity, unit_price, total_price)"
						+ " VALUES (?, ?, (SELECT id FROM extras WHERE hotel_id = ? LIMIT 1), 1, 50, 50)",
						reservationId, hotel2, hotel2))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	// ---------- C2: pricing overlap ----------

	@Test
	void overlappingPriceRangesAreRejected() {
		fixture();
		UUID ratePlan1 = insertRatePlan(hotel1, "BB", "BB");
		UUID junction1 = insertJunction(hotel1, roomType1, ratePlan1, "MAD");
		jdbc.update("INSERT INTO rate_plan_prices (id, room_type_rate_plan_id, currency_code, valid_from, valid_to, price_amount)"
				+ " VALUES (gen_random_uuid(), ?, 'MAD', '2026-08-01', '2026-08-10', 100)", junction1);
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO rate_plan_prices (id, room_type_rate_plan_id, currency_code, valid_from, valid_to, price_amount)"
						+ " VALUES (gen_random_uuid(), ?, 'MAD', '2026-08-05', '2026-08-20', 110)", junction1))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	// ---------- C3: offer integrity ----------

	@Test
	void reservationRoomMustUseOfferedRoomRateCombination() {
		fixture();
		UUID ratePlan1 = insertRatePlan(hotel1, "BB", "BB");
		UUID ratePlan2 = insertRatePlan(hotel1, "HB", "HB");
		insertJunction(hotel1, roomType1, ratePlan1, "MAD");
		bookingFixture();
		// room_type 1 + rate_plan 2 (HB) is NOT an offered pair
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO reservation_rooms(reservation_id, hotel_id, room_type_id, rate_plan_id, check_in_date,"
						+ " check_out_date, nights, rate_per_night, subtotal_amount)"
						+ " VALUES (?, ?, ?, ?, '2026-09-01', '2026-09-03', 2, 100, 200)",
						reservationId, hotel1, roomType1, ratePlan2))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	// ---------- C8: currency pinning ----------

	@Test
	void junctionCurrencyMustMatchRatePlanCurrency() {
		fixture();
		UUID ratePlan1 = insertRatePlan(hotel1, "EUR Plan", "EUR");
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO room_type_rate_plans(hotel_id, room_type_id, rate_plan_id, currency_code) VALUES (?, ?, ?, 'MAD')",
				hotel1, roomType1, ratePlan1))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void priceCurrencyMustMatchJunctionCurrency() {
		fixture();
		UUID ratePlan1 = insertRatePlan(hotel1, "BB", "BB");
		UUID junction1 = insertJunction(hotel1, roomType1, ratePlan1, "MAD");
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO rate_plan_prices (id, room_type_rate_plan_id, currency_code, valid_from, valid_to, price_amount)"
						+ " VALUES (gen_random_uuid(), ?, 'EUR', '2026-09-01', '2026-09-05', 90)", junction1))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	// ---------- C16: reservation monetary invariants ----------

	// Totals are code-enforced (server-side pricing): the booking service recomputes
	// every line from RatePlanPrice + TaxFeeType + promotion and persists
	// exactly the quote's values. The legacy DB CHECKs (chk_reservations_totals,
	// chk_reservation_extras_total) could not express extras or pricing-model
	// multipliers (per_person/per_night/per_room), so V15/V16 dropped them.
	// This test documents the new contract: a "wrong" total is accepted at the
	// DB layer and is the application's job to reject.
	@Test
	void reservationTotalsAreNotDbCheckedButCodeEnforced() {
		fixture();
		bookingFixture();
		jdbc.update(
				"INSERT INTO reservations (id, reference, idempotency_key, hotel_id, guest_id, check_in_date,"
						+ " check_out_date, adults, currency_code, subtotal_amount, discount_amount, tax_amount, fee_amount, total_amount)"
						+ " VALUES (gen_random_uuid(), 'RC-TOT01', 'totals-k1', ?, ?, '2026-09-01', '2026-09-04', 2, 'MAD', 300, 30, 32.40, 0, 310)",
						hotel1, guestId);
		Integer count = jdbc.queryForObject(
				"SELECT count(*) FROM reservations WHERE reference = 'RC-TOT01'", Integer.class);
		assertThat(count).isEqualTo(1);
	}

	@Test
	void roomLineNightsMustEqualDates() {
		fixture();
		UUID ratePlan1 = insertRatePlan(hotel1, "BB", "BB");
		insertJunction(hotel1, roomType1, ratePlan1, "MAD");
		bookingFixture();
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO reservation_rooms(reservation_id, hotel_id, room_type_id, rate_plan_id, check_in_date,"
						+ " check_out_date, nights, rate_per_night, subtotal_amount)"
						+ " VALUES (?, ?, ?, ?, '2026-09-01', '2026-09-04', 4, 100, 300)",
						reservationId, hotel1, roomType1, ratePlan1))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	// ---------- check_ins referential integrity ----------

	@Test
	void checkInCannotReferenceNonexistentReservation() {
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO check_ins(reservation_id, reservation_guest_id, status) VALUES ('00000000-0000-0000-0000-000000000000', NULL, 'pending')"))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	// ---------- C17: payment idempotency ----------

	@Test
	void paymentProviderReferenceIsUniquePerProvider() {
		fixture();
		bookingFixture();
		jdbc.update("INSERT INTO payments (id, reservation_id, amount, currency_code, provider, provider_reference)"
				+ " VALUES (gen_random_uuid(), ?, 200, 'MAD', 'stripe', 'pi_1')", reservationId);
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO payments (id, reservation_id, amount, currency_code, provider, provider_reference)"
						+ " VALUES (gen_random_uuid(), ?, 100, 'MAD', 'stripe', 'pi_1')", reservationId))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	// ---------- rate plan stay ranges ----------

	@Test
	void ratePlanMaxStayCannotBeBelowMinStay() {
		fixture();
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO rate_plans (id, hotel_id, name, code, currency_code, min_stay, max_stay)"
						+ " VALUES (gen_random_uuid(), ?, 'Bad', 'BAD', 'MAD', 5, 2)", hotel1))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	// ---------- C4: media single owner ----------

	@Test
	void mediaMustHaveExactlyOneOwner() {
		fixture();
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO media(url, hotel_id, room_type_id) VALUES ('http://x/1.jpg', ?, ?)",
				hotel1, roomType1))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	// ---------- V19: homepage featured flags ----------

	@Test
	void homepageFeaturedFlagsExistWithSafeDefaults() {
		for (String table : List.of("hotels", "room_types", "experiences", "reviews")) {
			Integer notNull = jdbc.queryForObject(
					"SELECT count(*) FROM information_schema.columns WHERE table_name = ?"
							+ " AND column_name = 'is_featured_on_homepage'"
							+ " AND is_nullable = 'NO' AND column_default = 'false'",
					Integer.class, table);
			assertThat(notNull).as("is_featured_on_homepage on %s", table).isEqualTo(1);
		}
	}

	@Test
	void unsetFeaturedFlagDefaultsToFalseAndNullIsRejected() {
		fixture();
		Boolean def = jdbc.queryForObject(
				"SELECT is_featured_on_homepage FROM hotels WHERE id = ?", Boolean.class, hotel1);
		assertThat(def).isFalse();
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO hotels (id, name, slug, country_code, default_currency, is_featured_on_homepage)"
						+ " VALUES (gen_random_uuid(), 'Hotel C', 'hotel-c', 'MA', 'MAD', NULL)"))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void featuredReviewMustStillBeApproved() {
		fixture();
		jdbc.update("INSERT INTO reviews (id, hotel_id, author_name, rating, moderation_status)"
				+ " VALUES (gen_random_uuid(), ?, 'A', 5, 'approved')", hotel1);
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO reviews (id, hotel_id, author_name, rating, moderation_status, is_featured_on_homepage)"
						+ " VALUES (gen_random_uuid(), ?, 'B', 5, 'pending', TRUE)", hotel1))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	// ---------- V17/V18: outbox recovery + room-type capacity ----------

	@Test
	void eventOutboxHasUpdatedAtForStaleClaimRecovery() {
		Integer columns = jdbc.queryForObject(
				"SELECT count(*) FROM information_schema.columns WHERE table_name = 'event_outbox'"
						+ " AND column_name = 'updated_at'",
				Integer.class);
		assertThat(columns).isEqualTo(1);
	}

	@Test
	void roomTypeInventoryCannotGoBelowSoldUnits() {
		fixture();
		jdbc.update("INSERT INTO availability (id, room_type_id, stay_date, rooms_sold) VALUES (gen_random_uuid(), ?, '2026-09-01', 3)", roomType1);
		// a room type with no sales can be reduced freely
		jdbc.update("UPDATE room_types SET total_inventory = 2 WHERE id = ?", roomType2);
		// reduction below sold units is rejected atomically (V18 trigger);
		// statement must be last — the RAISE aborts the transaction
		assertThatThrownBy(() -> jdbc.update(
				"UPDATE room_types SET total_inventory = 2 WHERE id = ?", roomType1))
				.isInstanceOf(org.springframework.jdbc.UncategorizedSQLException.class)
				.hasMessageContaining("total_inventory cannot be lower than sold units");
	}

	// ---------- platform / content blocks (V13) ----------

	@Test
	void hotelSlugMustBeUnique() {
		fixture();
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO hotels (id, name, slug, country_code, default_currency)"
						+ " VALUES (gen_random_uuid(), 'Hotel C', 'hotel-a', 'MA', 'MAD')"))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void contentBlockTypeIsClosedEnum() {
		platformFixture();
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO platform_content_blocks (id, platform_id, type, position)"
						+ " VALUES (gen_random_uuid(), ?, 'GALLERY', 1)", platformId))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void contentBlockPositionMustBeUniquePerPlatform() {
		platformFixture();
		jdbc.update("INSERT INTO platform_content_blocks (id, platform_id, type, position)"
				+ " VALUES (gen_random_uuid(), ?, 'HERO', 1)", platformId);
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO platform_content_blocks (platform_id, type, position)"
						+ " VALUES (?, 'EXPERIENCES', 1)", platformId))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void platformCanHaveOnlyOnePrimaryMedia() {
		platformFixture();
		jdbc.update("INSERT INTO media (id, url, platform_id, is_primary, sort_order)"
				+ " VALUES (gen_random_uuid(), 'http://x/p1.jpg', ?, TRUE, 0)", platformId);
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO media (url, platform_id, is_primary, sort_order)"
						+ " VALUES ('http://x/p2.jpg', ?, TRUE, 1)", platformId))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void mediaStillRejectsMultipleOwnersIncludingPlatform() {
		platformFixture();
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO media (url, platform_id, hotel_id) VALUES ('http://x/1.jpg', ?, ?)",
				platformId, hotel1))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void featuredItemCannotReferenceMissingExperience() {
		platformFixture();
		jdbc.update("INSERT INTO platform_content_blocks (id, platform_id, type, position)"
				+ " VALUES (gen_random_uuid(), ?, 'EXPERIENCES', 1)", platformId);
		UUID blockId = jdbc.queryForObject(
				"SELECT id FROM platform_content_blocks WHERE platform_id = ? AND type = 'EXPERIENCES'",
				UUID.class, platformId);
		jdbc.update("INSERT INTO featured_experiences_blocks (content_block_id, title)"
				+ " VALUES (?, 'Experiences')", blockId);
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO featured_experience_items (content_block_id, experience_id, position)"
						+ " VALUES (?, '00000000-0000-0000-0000-000000000000', 1)", blockId))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	private UUID insertRatePlan(UUID hotelId, String name, String code) {
		return jdbc.queryForObject(
				"INSERT INTO rate_plans (id, hotel_id, name, code, currency_code) OVERRIDING SYSTEM VALUE"
						+ " VALUES (gen_random_uuid(), ?, ?, ?, 'MAD') RETURNING id",
				UUID.class, hotelId, name, code);
	}

	private UUID insertJunction(UUID hotelId, UUID roomTypeId, UUID ratePlanId, String currencyCode) {
		return jdbc.queryForObject(
				"INSERT INTO room_type_rate_plans (id, hotel_id, room_type_id, rate_plan_id, currency_code) OVERRIDING SYSTEM VALUE"
						+ " VALUES (gen_random_uuid(), ?, ?, ?, ?) RETURNING id",
				UUID.class, hotelId, roomTypeId, ratePlanId, currencyCode);
	}

	private void platformFixture() {
		fixture();
		platformId = jdbc.queryForObject(
				"INSERT INTO platforms (id, name, slug) OVERRIDING SYSTEM VALUE"
						+ " VALUES (gen_random_uuid(), 'The Hotel Collection', 'the-hotel-collection') RETURNING id",
				UUID.class);
	}

	private void fixture() {
		jdbc.update("INSERT INTO countries(code, name) VALUES ('MA', 'Morocco') ON CONFLICT DO NOTHING");
		jdbc.update("INSERT INTO currencies(code, name) VALUES ('MAD', 'Moroccan Dirham'), ('EUR', 'Euro') ON CONFLICT DO NOTHING");
		hotel1 = jdbc.queryForObject(
				"INSERT INTO hotels (id, name, slug, country_code, default_currency) OVERRIDING SYSTEM VALUE"
						+ " VALUES (gen_random_uuid(), 'Hotel A', 'hotel-a', 'MA', 'MAD') RETURNING id",
				UUID.class);
		hotel2 = jdbc.queryForObject(
				"INSERT INTO hotels (id, name, slug, country_code, default_currency) OVERRIDING SYSTEM VALUE"
						+ " VALUES (gen_random_uuid(), 'Hotel B', 'hotel-b', 'MA', 'MAD') RETURNING id",
				UUID.class);
		roomType1 = jdbc.queryForObject(
				"INSERT INTO room_types (id, hotel_id, name) OVERRIDING SYSTEM VALUE"
						+ " VALUES (gen_random_uuid(), ?, 'Deluxe') RETURNING id",
				UUID.class, hotel1);
		roomType2 = jdbc.queryForObject(
				"INSERT INTO room_types (id, hotel_id, name) OVERRIDING SYSTEM VALUE"
						+ " VALUES (gen_random_uuid(), ?, 'Suite') RETURNING id",
				UUID.class, hotel1);
		roomType3 = jdbc.queryForObject(
				"INSERT INTO room_types (id, hotel_id, name) OVERRIDING SYSTEM VALUE"
						+ " VALUES (gen_random_uuid(), ?, 'Deluxe B') RETURNING id",
				UUID.class, hotel2);
	}

	private void bookingFixture() {
		userId = jdbc.queryForObject(
				"INSERT INTO users (id, first_name, last_name, email, password_hash) OVERRIDING SYSTEM VALUE"
						+ " VALUES (gen_random_uuid(), 'John', 'Doe', 'john@example.com', 'x') RETURNING id",
				UUID.class);
		guestId = jdbc.queryForObject(
				"INSERT INTO guests (id, user_id, first_name, last_name, email) OVERRIDING SYSTEM VALUE"
						+ " VALUES (gen_random_uuid(), ?, 'John', 'Doe', 'john@example.com') RETURNING id",
				UUID.class, userId);
		reservationId = jdbc.queryForObject(
				"INSERT INTO reservations (id, reference, idempotency_key, hotel_id, guest_id, check_in_date,"
						+ " check_out_date, adults, currency_code, subtotal_amount, total_amount)"
						+ " OVERRIDING SYSTEM VALUE"
						+ " VALUES (gen_random_uuid(), 'RC-0001', 'k1', ?, ?, '2026-09-01', '2026-09-03', 2, 'MAD', 200, 200) RETURNING id",
				UUID.class, hotel1, guestId);
	}

}
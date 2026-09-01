package com.hotelcollection.hotel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.hotelcollection.hotel.dto.availability.AvailabilityInput;
import com.hotelcollection.hotel.dto.availability.AvailabilityStatus;
import com.hotelcollection.hotel.dto.availability.RoomAvailability;
import com.hotelcollection.hotel.entity.Availability;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.repository.AvailabilityRepository;
import com.hotelcollection.hotel.service.impl.AvailabilityServiceImpl;

/**
 * Unit coverage for the availability status rule — the single decision that
 * tells a guest whether a stay can be booked. Two defects motivated it:
 *
 * <ul>
 * <li>a zero-night stay ({@code checkOut == checkIn}) skipped the night loop
 * entirely, so {@code minFree} stayed at {@code Integer.MAX_VALUE} and every
 * room type reported "available" even when fully sold out;</li>
 * <li>the "few rooms left" label was gated on {@code total > 2}, so a two-unit
 * room type with its last unit on sale was indistinguishable from one with
 * nothing sold at all.</li>
 * </ul>
 *
 * <p>Plain JUnit with a mocked repository and catalog: the arithmetic needs a
 * fast feedback loop, not Docker.
 */
class AvailabilityStatusTest {

	private static final UUID HOTEL = UUID.randomUUID();
	private static final UUID ROOM_TYPE = UUID.randomUUID();
	private static final LocalDate CHECK_IN = LocalDate.of(2026, 10, 6);

	private final AvailabilityRepository repository = mock(AvailabilityRepository.class);
	private final CatalogQueryService catalog = mock(CatalogQueryService.class);
	private final AvailabilityServiceImpl service = new AvailabilityServiceImpl(repository, catalog);

	/** A room type with {@code total} units, all of them physically present. */
	private static RoomType roomType(int total) {
		RoomType rt = new RoomType();
		rt.setId(ROOM_TYPE);
		rt.setHotelId(HOTEL);
		rt.setTotalInventory(total);
		rt.setMaxAdults((short) 4);
		rt.setMaxChildren((short) 2);
		return rt;
	}

	/** One inventory row for {@code date} with {@code sold} units gone. */
	private static Availability sold(LocalDate date, int sold) {
		Availability a = new Availability();
		a.setRoomTypeId(ROOM_TYPE);
		a.setStayDate(date);
		a.setRoomsSold(sold);
		a.setOutOfOrder(0);
		a.setBlocked(0);
		return a;
	}

	/** Stubs a hotel of one room type with {@code total} units, {@code sold} gone on night one. */
	private void inventory(int total, int sold) {
		when(catalog.activeRoomTypes(HOTEL)).thenReturn(List.of(roomType(total)));
		when(repository.findByRoomTypeIdsAndRange(anyCollection(), any(), any()))
				.thenReturn(List.of(sold(CHECK_IN, sold)));
	}

	private AvailabilityStatus statusFor(LocalDate checkOut) {
		List<RoomAvailability> rows = service.check(
				new AvailabilityInput(HOTEL, CHECK_IN, checkOut, 2, 0, 1));
		assertThat(rows).hasSize(1);
		return rows.get(0).status();
	}

	private AvailabilityStatus oneNightStatus() {
		return statusFor(CHECK_IN.plusDays(1));
	}

	// --- zero-night stays -------------------------------------------------

	@Test
	void rejectsAStayThatEndsOnItsCheckInDate() {
		inventory(4, 4);

		assertThatThrownBy(() -> statusFor(CHECK_IN))
				.isInstanceOf(DomainException.class)
				.hasMessageContaining("checkOutDate must be after checkInDate");
	}

	@Test
	void stillRejectsACheckOutBeforeCheckIn() {
		inventory(4, 0);

		assertThatThrownBy(() -> statusFor(CHECK_IN.minusDays(1)))
				.isInstanceOf(DomainException.class)
				.hasMessageContaining("checkOutDate must be after checkInDate");
	}

	// --- scarcity on small room types -------------------------------------

	@Test
	void twoUnitTypeWithItsLastUnitLeftIsFew() {
		inventory(2, 1);

		assertThat(oneNightStatus()).isEqualTo(AvailabilityStatus.few);
	}

	@Test
	void untouchedTwoUnitTypeIsPlainAvailable() {
		inventory(2, 0);

		assertThat(oneNightStatus()).isEqualTo(AvailabilityStatus.available);
	}

	@Test
	void singleUnitTypeWithNothingSoldIsPlainAvailable() {
		inventory(1, 0);

		assertThat(oneNightStatus()).isEqualTo(AvailabilityStatus.available);
	}

	// --- the pre-existing rule still holds ---------------------------------

	@Test
	void largeTypeIsFewOnceItDropsToTwoFreeUnits() {
		inventory(4, 2);

		assertThat(oneNightStatus()).isEqualTo(AvailabilityStatus.few);
	}

	@Test
	void largeTypeWithPlentyLeftIsAvailable() {
		inventory(10, 1);

		assertThat(oneNightStatus()).isEqualTo(AvailabilityStatus.available);
	}

	@Test
	void fullySoldNightIsSoldOut() {
		inventory(4, 4);

		assertThat(oneNightStatus()).isEqualTo(AvailabilityStatus.soldout);
	}

	@Test
	void soldOutWhenFewerFreeUnitsThanRoomsRequested() {
		inventory(2, 1);

		List<RoomAvailability> rows = service.check(
				new AvailabilityInput(HOTEL, CHECK_IN, CHECK_IN.plusDays(1), 2, 0, 2));

		assertThat(rows).hasSize(1);
		assertThat(rows.get(0).status()).isEqualTo(AvailabilityStatus.soldout);
		assertThat(rows.get(0).available()).isFalse();
	}

	/** Sparse model: a night with no row is fully free, so the sold night governs. */
	@Test
	void tightestNightGovernsAcrossTheStay() {
		inventory(4, 4);

		assertThat(statusFor(CHECK_IN.plusDays(3))).isEqualTo(AvailabilityStatus.soldout);
	}
}

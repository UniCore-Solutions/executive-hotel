package com.hotelcollection.hotel.integration;
import com.hotelcollection.hotel.entity.Room;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.entity.CancellationPenaltyType;
import com.hotelcollection.hotel.entity.RatePlan;
import com.hotelcollection.hotel.entity.RatePlanPrice;
import com.hotelcollection.hotel.entity.RoomTypeRatePlan;
import com.hotelcollection.hotel.entity.TaxFeeCalculationMethod;
import com.hotelcollection.hotel.entity.TaxFeeChargeType;
import com.hotelcollection.hotel.entity.TaxFeeType;
import com.hotelcollection.hotel.repository.HotelRepository;
import com.hotelcollection.hotel.repository.RatePlanPriceRepository;
import com.hotelcollection.hotel.repository.RatePlanRepository;
import com.hotelcollection.hotel.repository.RoomRepository;
import com.hotelcollection.hotel.repository.RoomTypeRatePlanRepository;
import com.hotelcollection.hotel.repository.RoomTypeRepository;
import com.hotelcollection.hotel.repository.TaxFeeTypeRepository;

/**
 * Test seed data: a bookable hotel with one room type, one refundable rate
 * plan (bb), nightly price 1000.00, {@code inventoryPerNight} PHYSICAL ROOMS
 * (inventory is derived from physical rooms — V26), and a 12% tax.
 * Sparse inventory: no availability rows pre-seeded — a missing night is
 * fully available and materialized on booking.
 */
@Component
public class TestFixtures {

	private final HotelRepository hotels;
	private final RoomTypeRepository roomTypes;
	private final RatePlanRepository ratePlans;
	private final RoomTypeRatePlanRepository links;
	private final RatePlanPriceRepository prices;
	private final TaxFeeTypeRepository taxFeeTypes;
	private final RoomRepository rooms;

	public TestFixtures(HotelRepository hotels, RoomTypeRepository roomTypes,
			RatePlanRepository ratePlans, RoomTypeRatePlanRepository links,
			RatePlanPriceRepository prices,
			TaxFeeTypeRepository taxFeeTypes, RoomRepository rooms,
			jakarta.persistence.EntityManager entityManager) {
		this.hotels = hotels;
		this.roomTypes = roomTypes;
		this.ratePlans = ratePlans;
		this.links = links;
		this.prices = prices;
		this.taxFeeTypes = taxFeeTypes;
		this.rooms = rooms;
		this.entityManager = entityManager;
	}

	public static final String CURRENCY = "MAD";
	public static final BigDecimal RATE = new BigDecimal("1000.00");

	public record HotelFixture(Hotel hotel, RoomType roomType, RatePlan ratePlan,
			RoomTypeRatePlan link, RatePlanPrice price) {
		public UUID hotelId() {
			return hotel.getId();
		}
	}

	@org.springframework.transaction.annotation.Transactional
	public HotelFixture newBookableHotel() {
		return newBookableHotel("Refundable BB plan", 3);
	}

	@org.springframework.transaction.annotation.Transactional
	public HotelFixture newBookableHotel(String ratePlanName, int inventoryPerNight) {
		seedReferenceData();
		Hotel hotel = new Hotel();
		hotel.setName("Test Hotel " + System.nanoTime());
		hotel.setSlug("test-hotel-" + System.nanoTime());
		hotel.setBrand("Hotel Collection");
		hotel.setDescription("Integration test hotel");
		hotel.setCity("Marrakech");
		hotel.setCountryCode("MA");
		hotel.setDefaultCurrency(CURRENCY);
		hotel.setStatus("active");
		hotel.setCreatedAt(Instant.now());
		hotel.setUpdatedAt(Instant.now());
		hotels.save(hotel);

		RoomType roomType = new RoomType();
		roomType.setHotelId(hotel.getId());
		roomType.setName("Deluxe Room");
		roomType.setMaxAdults((short) 2);
		roomType.setMaxChildren((short) 1);
		roomType.setTotalInventory(inventoryPerNight);
		roomType.setStatus("active");
		roomType.setCreatedAt(Instant.now());
		roomType.setUpdatedAt(Instant.now());
		roomTypes.save(roomType);

		// Inventory is derived from PHYSICAL ROOMS (V26): create the rooms that
		// back the requested capacity. total_inventory on the DB row is
		// recomputed by the trigger; the in-memory fixture value is only a
		// convenience for assertions.
		for (int i = 1; i <= inventoryPerNight; i++) {
			Room room = new Room();
			room.setHotelId(hotel.getId());
			room.setRoomTypeId(roomType.getId());
			room.setRoomNumber(String.format("%03d", 500 + i));
			room.setFloor("5");
			room.setStatus("active");
			room.setHousekeepingStatus("clean");
			room.setMaintenanceStatus("ok");
			room.setCreatedAt(Instant.now());
			room.setUpdatedAt(Instant.now());
			rooms.save(room);
		}

		RatePlan plan = new RatePlan();
		plan.setHotelId(hotel.getId());
		plan.setName(ratePlanName);
		plan.setCode("bb");
		plan.setCurrencyCode(CURRENCY);
		plan.setMealPlan("bb");
		plan.setCancellationPolicy("free-cancel 2 days");
		plan.setRefundable(true);
		plan.setCancellationDeadlineDays((short) 2);
		plan.setCancellationPenaltyType(CancellationPenaltyType.first_night);
		plan.setPaymentTiming("pay_at_property");
		plan.setStatus("active");
		plan.setCreatedAt(Instant.now());
		plan.setUpdatedAt(Instant.now());
		ratePlans.save(plan);

		RoomTypeRatePlan link = new RoomTypeRatePlan();
		link.setHotelId(hotel.getId());
		link.setRoomTypeId(roomType.getId());
		link.setRatePlanId(plan.getId());
		link.setCurrencyCode(CURRENCY);
		links.save(link);

		RatePlanPrice price = new RatePlanPrice();
		price.setRoomTypeRatePlanId(link.getId());
		price.setCurrencyCode(CURRENCY);
		price.setValidFrom(LocalDate.now().minusDays(30));
		price.setValidTo(LocalDate.now().plusDays(90));
		price.setPriceAmount(RATE);
		price.setCreatedAt(Instant.now());
		price.setUpdatedAt(Instant.now());
		prices.save(price);

		TaxFeeType tax = new TaxFeeType();
		tax.setHotelId(hotel.getId());
		tax.setName("VAT");
		tax.setChargeType(TaxFeeChargeType.tax);
		tax.setCalculationMethod(TaxFeeCalculationMethod.percentage);
		tax.setValue(new BigDecimal("12.00"));
		tax.setStatus("active");
		tax.setCreatedAt(Instant.now());
		taxFeeTypes.save(tax);

		return new HotelFixture(hotel, roomType, plan, link, price);
	}

	private void seedReferenceData() {
		entityManager.createNativeQuery(
				"insert into countries (code, name) values ('MA', 'Morocco') on conflict do nothing")
				.executeUpdate();
		entityManager.createNativeQuery(
				"insert into currencies (code, name, decimal_places) values ('MAD', 'Moroccan Dirham', 2) on conflict do nothing")
				.executeUpdate();
	}

	private final jakarta.persistence.EntityManager entityManager;
}
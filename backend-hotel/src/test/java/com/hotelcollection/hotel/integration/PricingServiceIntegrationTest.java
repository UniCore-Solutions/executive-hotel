package com.hotelcollection.hotel.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import com.hotelcollection.hotel.dto.rate.Quote;
import com.hotelcollection.hotel.dto.rate.QuoteExtraInput;
import com.hotelcollection.hotel.dto.rate.QuoteInput;
import com.hotelcollection.hotel.dto.rate.QuoteLineInput;
import com.hotelcollection.hotel.repository.PromotionRepository;
import com.hotelcollection.hotel.service.PricingService;
import com.hotelcollection.hotel.dto.rate.ExtraLineSpec;
import com.hotelcollection.hotel.entity.Extra;
import com.hotelcollection.hotel.entity.ExtraPricingModel;
import com.hotelcollection.hotel.entity.Promotion;
import com.hotelcollection.hotel.entity.PromotionDiscountType;
import com.hotelcollection.hotel.repository.ExtraRepository;

/**
 * Pricing engine vs frontend quote math (pricing.ts): single nightly rate,
 * 12% tax, percentage/fixed promos, extras per pricing model.
 */
@SpringBootTest
@ContextConfiguration(classes = TestcontainersConfiguration.class)
class PricingServiceIntegrationTest {

	@Autowired
	PricingService pricingService;

	@Autowired
	TestFixtures fixtures;

	@Autowired
	private PromotionRepository promoRepository;

	@Autowired
	private com.hotelcollection.hotel.repository.ExtraRepository extraRepository;

	@Test
	void quoteMatchesFrontendMath() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		LocalDate checkIn = LocalDate.now().plusDays(5);
		LocalDate checkOut = checkIn.plusDays(3);

		Quote quote = pricingService.quote(new QuoteInput(fx.hotelId(), checkIn, checkOut, 2, 0,
				TestFixtures.CURRENCY,
				List.of(new QuoteLineInput(fx.roomType().getId(), fx.ratePlan().getId())),
				List.of(), null));

		assertThat(quote.currencyCode()).isEqualTo(TestFixtures.CURRENCY);
		assertThat(quote.valid()).isTrue();
		assertThat(quote.subtotalAmount()).isEqualByComparingTo(new BigDecimal("3000.00"));
		assertThat(quote.discountAmount()).isZero();
		assertThat(quote.taxAmount()).isEqualByComparingTo(new BigDecimal("360.00"));
		assertThat(quote.feeAmount()).isZero();
		assertThat(quote.totalAmount()).isEqualByComparingTo(new BigDecimal("3360.00"));
		assertThat(quote.originalTotal()).isEqualByComparingTo(quote.totalAmount());
	}

	@Test
	void percentagePromoDiscountsSubtotalBeforeTaxes() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		// 10% promo (frontend demo: 'TENOFF')
		newPromo(fx, "TENOFF", com.hotelcollection.hotel.entity.PromotionDiscountType.percentage,
				new BigDecimal("10"));

		LocalDate checkIn = LocalDate.now().plusDays(5);
		LocalDate checkOut = checkIn.plusDays(3);
		Quote quote = pricingService.quote(new QuoteInput(fx.hotelId(), checkIn, checkOut, 2, 0,
				TestFixtures.CURRENCY,
				List.of(new QuoteLineInput(fx.roomType().getId(), fx.ratePlan().getId())),
				List.of(), "tenoff"));

		assertThat(quote.discountAmount()).isEqualByComparingTo(new BigDecimal("300.00"));
		// tax on discounted base: (3000 - 300) * 12% = 324
		assertThat(quote.taxAmount()).isEqualByComparingTo(new BigDecimal("324.00"));
		assertThat(quote.totalAmount()).isEqualByComparingTo(new BigDecimal("3024.00"));
	}

	@Test
	void invalidPromoCodeSoftFailsWithMessageInsteadOfThrowing() {
		// An unknown/inapplicable promo code must never fail the whole quote —
		// room pricing is still valid without it (C16's totals hold); only the
		// promo-specific outcome is surfaced via Quote.valid()/message().
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		LocalDate checkIn = LocalDate.now().plusDays(5);
		LocalDate checkOut = checkIn.plusDays(3);

		Quote quote = pricingService.quote(new QuoteInput(fx.hotelId(), checkIn, checkOut, 2, 0,
				TestFixtures.CURRENCY,
				List.of(new QuoteLineInput(fx.roomType().getId(), fx.ratePlan().getId())),
				List.of(), "NOPE"));

		assertThat(quote.valid()).isFalse();
		assertThat(quote.promoMessage()).contains("not a valid promo code");
		assertThat(quote.discountAmount()).isZero();
		// Room pricing itself is unaffected by the bad promo code.
		assertThat(quote.subtotalAmount()).isEqualByComparingTo(new BigDecimal("3000.00"));
		assertThat(quote.totalAmount()).isGreaterThan(BigDecimal.ZERO);
	}

	@Test
	void extrasArePricedPerModel() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		// 3 nights, 2 adults, 1 room line (fixture defaults); each extra 100.00, qty 1.
		UUID perStay = newExtra(fx, "per_stay");
		UUID perNight = newExtra(fx, "per_night");
		UUID perPerson = newExtra(fx, "per_person");
		UUID perRoom = newExtra(fx, "per_room");

		LocalDate checkIn = LocalDate.now().plusDays(5);
		LocalDate checkOut = checkIn.plusDays(3);
		Quote quote = pricingService.quote(new QuoteInput(fx.hotelId(), checkIn, checkOut, 2, 0,
				TestFixtures.CURRENCY,
				List.of(new QuoteLineInput(fx.roomType().getId(), fx.ratePlan().getId())),
				List.of(new QuoteExtraInput(perStay, 1), new QuoteExtraInput(perNight, 1),
						new QuoteExtraInput(perPerson, 1), new QuoteExtraInput(perRoom, 1)),
				null));

		// per_stay 100 * 1; per_night 100 * 3 nights; per_person 100 * 2 adults;
		// per_room 100 * 1 room -> 700.00 extras, tax applies to the room base only.
		assertThat(quote.extras()).hasSize(4);
		assertThat(quote.extras().stream()
				.map(com.hotelcollection.hotel.dto.rate.ExtraLineSpec::totalPrice)
				.reduce(BigDecimal.ZERO, BigDecimal::add))
				.isEqualByComparingTo(new BigDecimal("700.00"));
		assertThat(quote.subtotalAmount()).isEqualByComparingTo(new BigDecimal("3000.00"));
		assertThat(quote.taxAmount()).isEqualByComparingTo(new BigDecimal("360.00"));
		assertThat(quote.totalAmount()).isEqualByComparingTo(new BigDecimal("4060.00"));
	}

	@Test
	void extrasArePricedPerPersonAgainstAdultsNotQuantity() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		UUID perPerson = newExtra(fx, "per_person");
		LocalDate checkIn = LocalDate.now().plusDays(5);
		LocalDate checkOut = checkIn.plusDays(3);
		// qty 2 (two travellers buy breakfast), 4 adults: price * 2 * 4
		Quote quote = pricingService.quote(new QuoteInput(fx.hotelId(), checkIn, checkOut, 4, 0,
				TestFixtures.CURRENCY,
				List.of(new QuoteLineInput(fx.roomType().getId(), fx.ratePlan().getId())),
				List.of(new QuoteExtraInput(perPerson, 2)), null));
		assertThat(quote.extras().get(0).totalPrice()).isEqualByComparingTo(new BigDecimal("800.00"));
	}

	private UUID newExtra(TestFixtures.HotelFixture fx, String model) {
		com.hotelcollection.hotel.entity.Extra extra =
				new com.hotelcollection.hotel.entity.Extra();
		extra.setHotelId(fx.hotelId());
		extra.setName("Extra " + model);
		extra.setPricingModel(com.hotelcollection.hotel.entity.ExtraPricingModel
				.valueOf(model));
		extra.setPriceAmount(new BigDecimal("100.00"));
		extra.setCurrencyCode(TestFixtures.CURRENCY);
		extra.setStatus("active");
		extra.setCreatedAt(java.time.Instant.now());
		extra.setUpdatedAt(java.time.Instant.now());
		return extraRepository.save(extra).getId();
	}

	private com.hotelcollection.hotel.entity.Promotion newPromo(TestFixtures.HotelFixture fx,
			String code, com.hotelcollection.hotel.entity.PromotionDiscountType type,
			java.math.BigDecimal value) {
		com.hotelcollection.hotel.entity.Promotion promo = new com.hotelcollection.hotel.entity.Promotion();
		promo.setHotelId(fx.hotelId());
		promo.setCode(code);
		promo.setName("Promo " + code);
		promo.setDiscountType(type);
		promo.setDiscountValue(value);
		promo.setStatus("active");
		promo.setStackable(false);
		promo.setAppliesToAllRoomTypes(true);
		promo.setAppliesToAllRatePlans(true);
		promo.setCreatedAt(java.time.Instant.now());
		promo.setUpdatedAt(java.time.Instant.now());
		return promoRepository.save(promo);
	}
}
package com.hotelcollection.hotel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.hotelcollection.hotel.dto.rate.ExtraLineSpec;
import com.hotelcollection.hotel.dto.rate.QuoteExtraInput;
import com.hotelcollection.hotel.dto.rate.QuoteInput;
import com.hotelcollection.hotel.entity.Extra;
import com.hotelcollection.hotel.entity.ExtraPricingModel;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.service.impl.PricingServiceImpl;

/**
 * Unit coverage for extras pricing — the one place where the same booking
 * input produces four different totals depending on the extra's pricing model,
 * and where an off-by-one multiplier is both easy to introduce and invisible
 * until a guest is overcharged.
 *
 * <p>Deliberately a plain JUnit test: no Spring context, no Testcontainers, no
 * Docker. The rest of the pricing suite is integration-level
 * ({@code PricingServiceIntegrationTest}), which means the arithmetic itself
 * had no fast feedback loop before this.
 */
class PricingExtraLinesTest {

	private static final UUID HOTEL = UUID.randomUUID();
	private static final UUID OTHER_HOTEL = UUID.randomUUID();
	private static final String CURRENCY = "MAD";

	private final CatalogQueryService catalog = mock(CatalogQueryService.class);

	/** Only {@code catalog} participates in extraLines; the rest stay unused. */
	private final PricingServiceImpl pricing =
			new PricingServiceImpl(null, null, null, null, catalog, null);

	private Extra extra(UUID id, ExtraPricingModel model, String price, UUID hotelId,
			String currency) {
		Extra e = new Extra();
		e.setId(id);
		e.setHotelId(hotelId);
		e.setName("test extra");
		e.setPricingModel(model);
		e.setPriceAmount(new BigDecimal(price));
		e.setCurrencyCode(currency);
		return e;
	}

	private QuoteInput input(UUID extraId, int quantity, int adults) {
		return new QuoteInput(HOTEL, LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 4), adults, 0,
				CURRENCY, List.of(), List.of(new QuoteExtraInput(extraId, quantity)), null);
	}

	private ExtraLineSpec onlyLine(Extra e, QuoteInput in, int nights, int rooms) {
		when(catalog.extrasByIds(anyList())).thenReturn(Map.of(e.getId(), e));
		List<ExtraLineSpec> lines = pricing.extraLines(in, nights, rooms);
		assertThat(lines).hasSize(1);
		return lines.get(0);
	}

	@Test
	void perStayChargesOncePerQuantityRegardlessOfNightsOrGuests() {
		UUID id = UUID.randomUUID();
		Extra e = extra(id, ExtraPricingModel.per_stay, "150.00", HOTEL, CURRENCY);
		ExtraLineSpec line = onlyLine(e, input(id, 2, 4), 3, 2);

		assertThat(line.totalPrice()).isEqualByComparingTo("300.00");
		assertThat(line.unitPrice()).isEqualByComparingTo("150.00");
		assertThat(line.quantity()).isEqualTo(2);
		assertThat(line.perNight()).isFalse();
	}

	@Test
	void perNightMultipliesByNightsAndFlagsTheLine() {
		UUID id = UUID.randomUUID();
		Extra e = extra(id, ExtraPricingModel.per_night, "80.00", HOTEL, CURRENCY);
		ExtraLineSpec line = onlyLine(e, input(id, 2, 4), 3, 2);

		// 80 * (2 qty * 3 nights)
		assertThat(line.totalPrice()).isEqualByComparingTo("480.00");
		// Only per_night lines carry a stay date on the reservation.
		assertThat(line.perNight()).isTrue();
	}

	@Test
	void perPersonMultipliesByAdultsOnly() {
		UUID id = UUID.randomUUID();
		Extra e = extra(id, ExtraPricingModel.per_person, "50.00", HOTEL, CURRENCY);
		// 4 adults, 0 children — children deliberately do not count.
		ExtraLineSpec line = onlyLine(e, input(id, 2, 4), 3, 2);

		assertThat(line.totalPrice()).isEqualByComparingTo("400.00");
		assertThat(line.perNight()).isFalse();
	}

	@Test
	void perRoomMultipliesByRoomCount() {
		UUID id = UUID.randomUUID();
		Extra e = extra(id, ExtraPricingModel.per_room, "25.00", HOTEL, CURRENCY);
		ExtraLineSpec line = onlyLine(e, input(id, 2, 4), 3, 2);

		assertThat(line.totalPrice()).isEqualByComparingTo("100.00");
	}

	/** The four models must genuinely differ for the same booking input. */
	@Test
	void thePricingModelsProduceDifferentTotalsForTheSameBooking() {
		UUID id = UUID.randomUUID();
		QuoteInput in = input(id, 1, 4);
		BigDecimal perStay = onlyLine(extra(id, ExtraPricingModel.per_stay, "100.00", HOTEL,
				CURRENCY), in, 3, 2).totalPrice();
		BigDecimal perNight = onlyLine(extra(id, ExtraPricingModel.per_night, "100.00", HOTEL,
				CURRENCY), in, 3, 2).totalPrice();
		BigDecimal perPerson = onlyLine(extra(id, ExtraPricingModel.per_person, "100.00", HOTEL,
				CURRENCY), in, 3, 2).totalPrice();
		BigDecimal perRoom = onlyLine(extra(id, ExtraPricingModel.per_room, "100.00", HOTEL,
				CURRENCY), in, 3, 2).totalPrice();

		assertThat(perStay).isEqualByComparingTo("100.00");
		assertThat(perNight).isEqualByComparingTo("300.00");
		assertThat(perPerson).isEqualByComparingTo("400.00");
		assertThat(perRoom).isEqualByComparingTo("200.00");
	}

	@Test
	void noExtrasYieldsNoLines() {
		QuoteInput in = new QuoteInput(HOTEL, LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 4),
				2, 0, CURRENCY, List.of(), List.of(), null);
		assertThat(pricing.extraLines(in, 3, 1)).isEmpty();

		QuoteInput nullExtras = new QuoteInput(HOTEL, LocalDate.of(2026, 6, 1),
				LocalDate.of(2026, 6, 4), 2, 0, CURRENCY, List.of(), null, null);
		assertThat(pricing.extraLines(nullExtras, 3, 1)).isEmpty();
	}

	/** An extra belonging to another hotel must never be sellable here. */
	@Test
	void rejectsAnExtraFromAnotherHotel() {
		UUID id = UUID.randomUUID();
		Extra foreign = extra(id, ExtraPricingModel.per_stay, "100.00", OTHER_HOTEL, CURRENCY);
		when(catalog.extrasByIds(anyList())).thenReturn(Map.of(id, foreign));

		assertThatThrownBy(() -> pricing.extraLines(input(id, 1, 2), 3, 1))
				.isInstanceOf(DomainException.class)
				.hasMessageContaining("is not available");
	}

	@Test
	void rejectsAnUnknownExtra() {
		when(catalog.extrasByIds(anyList())).thenReturn(Map.of());

		assertThatThrownBy(() -> pricing.extraLines(input(UUID.randomUUID(), 1, 2), 3, 1))
				.isInstanceOf(DomainException.class)
				.hasMessageContaining("is not available");
	}

	/** Money is MAD end to end; a mismatched extra currency must not be summed. */
	@Test
	void rejectsAnExtraPricedInAnotherCurrency() {
		UUID id = UUID.randomUUID();
		Extra eur = extra(id, ExtraPricingModel.per_stay, "100.00", HOTEL, "EUR");
		when(catalog.extrasByIds(anyList())).thenReturn(Map.of(id, eur));

		assertThatThrownBy(() -> pricing.extraLines(input(id, 1, 2), 3, 1))
				.isInstanceOf(DomainException.class)
				.hasMessageContaining("currency");
	}
}

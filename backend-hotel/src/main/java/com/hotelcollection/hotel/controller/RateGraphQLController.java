package com.hotelcollection.hotel.controller;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.UUID;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.BatchMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import com.hotelcollection.hotel.dto.rate.Quote;
import com.hotelcollection.hotel.dto.rate.QuoteInput;
import com.hotelcollection.hotel.dto.rate.QuoteLineInput;
import com.hotelcollection.hotel.dto.rate.RatesInput;
import com.hotelcollection.hotel.dto.rate.RoomRateOption;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.Promotion;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.service.PricingService;
import com.hotelcollection.hotel.service.RateQueryService;

/**
 * Rate GraphQL controller: offers/rates/quote queries and the price fields of
 * hotel and room type (from-price display, nightly price). Purely delegates
 * to the rate service layer.
 */
@Controller
public class RateGraphQLController {

	private final RateQueryService rate;
	private final PricingService pricing;

	public RateGraphQLController(RateQueryService rate, PricingService pricing) {
		this.rate = rate;
		this.pricing = pricing;
	}

	@QueryMapping
	public List<Promotion> offers(@Argument UUID hotelId) {
		return rate.offers(hotelId);
	}

	@QueryMapping
	public List<RoomRateOption> rates(@Argument RatesInput input) {
		return pricing.rates(input.hotelId(), input.roomTypeId(), input.checkInDate());
	}

	@QueryMapping
	public Quote quote(@Argument QuoteInput input) {
		return pricing.quote(new QuoteInput(input.hotelId(), input.checkInDate(),
				input.checkOutDate(), input.adults(), input.children(), input.currencyCode(),
				input.rooms().stream()
						.map(r -> new QuoteLineInput(r.roomTypeId(), r.ratePlanId())).toList(),
				input.extras() == null ? List.of() : input.extras(), input.promoCode()));
	}

	// ------------------------------------------------------- price fields

	@BatchMapping(typeName = "Hotel", field = "fromPricePerNight")
	public Map<Hotel, Integer> hotelFromPrices(Collection<Hotel> hotels) {
		Map<UUID, Integer> prices = rate.minPriceByHotelIds(
				hotels.stream().map(Hotel::getId).toList());
		return hotels.stream().collect(Collectors.toMap(Function.identity(),
				h -> prices.getOrDefault(h.getId(), 0)));
	}

	@BatchMapping(typeName = "RoomType", field = "pricePerNight")
	public Map<RoomType, Integer> roomTypePrices(Collection<RoomType> roomTypes) {
		Map<UUID, Integer> prices = rate.minPriceByRoomTypeIds(
				roomTypes.stream().map(RoomType::getId).toList());
		return roomTypes.stream().collect(Collectors.toMap(Function.identity(),
				rt -> prices.getOrDefault(rt.getId(), 0)));
	}
}
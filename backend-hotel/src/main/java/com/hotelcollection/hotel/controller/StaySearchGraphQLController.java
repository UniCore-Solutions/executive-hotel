package com.hotelcollection.hotel.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import com.hotelcollection.hotel.dto.availability.AvailabilityInput;
import com.hotelcollection.hotel.dto.availability.RoomAvailability;
import com.hotelcollection.hotel.dto.availability.StaySearchInput;
import com.hotelcollection.hotel.dto.availability.StaySearchRoom;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.service.AvailabilityService;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.service.PricingService;

/**
 * Stay-search GraphQL controller: composes the active hotel scope with live
 * availability, rates and room-type catalog data into one query so clients
 * avoid per-hotel fan-out. Without a hotelId the search targets the
 * platform's single active hotel (canonicalHotel); with one, that hotel.
 */
@Controller
public class StaySearchGraphQLController {

	private final CatalogQueryService catalog;
	private final AvailabilityService availability;
	private final PricingService pricing;

	public StaySearchGraphQLController(CatalogQueryService catalog,
			AvailabilityService availability, PricingService pricing) {
		this.catalog = catalog;
		this.availability = availability;
		this.pricing = pricing;
	}

	@QueryMapping
	public List<StaySearchRoom> staySearch(@Argument StaySearchInput input) {
		Hotel hotel;
		if (input.hotelId() != null) {
			hotel = catalog.getHotel(input.hotelId());
			if (!"active".equals(hotel.getStatus())) {
				throw com.hotelcollection.hotel.exception.DomainException
						.notFound("hotel not found");
			}
		} else {
			// single-hotel platform: the one active hotel is the search scope
			hotel = catalog.canonicalHotel();
		}

		List<StaySearchRoom> out = new ArrayList<>();
		List<RoomAvailability> rows = availability.check(new AvailabilityInput(
				hotel.getId(), input.checkInDate(), input.checkOutDate(),
				input.adults(), input.children(), input.rooms()));
		Map<UUID, RoomAvailability> byRoomType = rows.stream()
				.collect(Collectors.toMap(RoomAvailability::roomTypeId, Function.identity()));

		for (RoomType rt : catalog.activeRoomTypes(hotel.getId())) {
			RoomAvailability row = byRoomType.get(rt.getId());
			if (row == null) {
				continue;
			}
			out.add(new StaySearchRoom(hotel.getId(), hotel.getName(), rt, row.status(),
					row.capacityFits(), pricing.rates(hotel.getId(), rt.getId(),
							input.checkInDate())));
		}
		return out;
	}
}

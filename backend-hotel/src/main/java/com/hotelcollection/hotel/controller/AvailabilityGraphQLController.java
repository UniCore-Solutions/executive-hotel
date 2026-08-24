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

import com.hotelcollection.hotel.dto.availability.AvailabilityInput;
import com.hotelcollection.hotel.dto.availability.RoomAvailability;
import com.hotelcollection.hotel.entity.Availability;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.service.AvailabilityService;
import com.hotelcollection.hotel.service.CatalogQueryService;

/**
 * Availability GraphQL controller: the public availability check. The
 * capacity fields of {@code AvailabilityRow} are resolved in batches via
 * the catalog service (no N+1).
 */
@Controller
public class AvailabilityGraphQLController {

	private final AvailabilityService availability;
	private final CatalogQueryService catalog;

	public AvailabilityGraphQLController(AvailabilityService availability,
			CatalogQueryService catalog) {
		this.availability = availability;
		this.catalog = catalog;
	}

	@QueryMapping
	public List<RoomAvailability> availability(@Argument AvailabilityInput input) {
		return availability.check(input);
	}

	@BatchMapping(typeName = "AvailabilityRow", field = "totalInventory")
	public Map<Availability, Integer> totalInventory(Collection<Availability> rows) {
		Map<UUID, RoomType> byId = catalog.roomTypesByIds(
				rows.stream().map(Availability::getRoomTypeId).toList());
		return rows.stream().collect(Collectors.toMap(Function.identity(),
				row -> byId.getOrDefault(row.getRoomTypeId(), null) == null ? 0
						: byId.get(row.getRoomTypeId()).getTotalInventory()));
	}

	@BatchMapping(typeName = "AvailabilityRow", field = "free")
	public Map<Availability, Integer> free(Collection<Availability> rows) {
		Map<UUID, RoomType> byId = catalog.roomTypesByIds(
				rows.stream().map(Availability::getRoomTypeId).toList());
		return rows.stream().collect(Collectors.toMap(Function.identity(),
				row -> {
					RoomType rt = byId.get(row.getRoomTypeId());
					return rt == null ? 0 : row.free(rt.getTotalInventory());
				}));
	}
}
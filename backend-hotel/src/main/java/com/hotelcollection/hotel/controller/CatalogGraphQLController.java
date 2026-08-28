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
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import com.hotelcollection.hotel.dto.PageInput;
import com.hotelcollection.hotel.dto.catalog.HotelDetails;
import com.hotelcollection.hotel.dto.catalog.HotelSearchInput;
import com.hotelcollection.hotel.dto.catalog.HotelSearchResult;
import com.hotelcollection.hotel.entity.Amenity;
import com.hotelcollection.hotel.entity.Country;
import com.hotelcollection.hotel.entity.Experience;
import com.hotelcollection.hotel.entity.Extra;
import com.hotelcollection.hotel.entity.Faq;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.entity.Restaurant;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.service.HotelPolicyQueryService;
import com.hotelcollection.hotel.service.ReferenceQueryService;
import com.hotelcollection.hotel.service.ReviewService;

/**
 * Catalog GraphQL controller: hotel/room-type queries and entity field
 * resolvers. Purely delegates to the service layer (the "from" price
 * and nightly price fields are resolved by the rate controller).
 */
@Controller
public class CatalogGraphQLController {

	private final CatalogQueryService catalog;
	private final ReviewService review;
	private final HotelPolicyQueryService policies;
	private final ReferenceQueryService reference;

	public CatalogGraphQLController(CatalogQueryService catalog, ReviewService review,
			HotelPolicyQueryService policies, ReferenceQueryService reference) {
		this.catalog = catalog;
		this.review = review;
		this.policies = policies;
		this.reference = reference;
	}

	@QueryMapping
	public HotelSearchResult hotels(@Argument HotelSearchInput input) {
		int p = input == null || input.page() == null ? 0
				: (input.page().page() == null ? 0 : input.page().page());
		int s = input == null || input.page() == null ? 20
				: (input.page().size() == null ? 20 : input.page().size());
		return catalog.search(input == null ? null : input.query(), p, s,
				input == null ? null : input.sort());
	}

	/** The platform's single property (exactly one active hotel must exist). */
	@QueryMapping
	public Hotel canonicalHotel() {
		return catalog.canonicalHotel();
	}

	@QueryMapping
	public Hotel hotel(@Argument UUID id) {
		return requireActiveHotel(id);
	}

	@QueryMapping
	public HotelDetails hotelDetails(@Argument UUID id) {
		Hotel hotel = requireActiveHotel(id);
		long count = review.countApproved(id);
		Double avg = count == 0 ? null : review.averageRating(id);
		return new HotelDetails(hotel, catalog.experiences(id), catalog.restaurants(id),
				catalog.faqs(id), policies.policies(id),
				review.pagedApproved(id, new PageInput(0, 20)), count, avg);
	}

	@QueryMapping
	public RoomType roomType(@Argument String id) {
		RoomType roomType;
		try {
			UUID uuid = UUID.fromString(id);
			roomType = catalog.getRoomType(uuid);
		} catch (IllegalArgumentException e) {
			roomType = catalog.getRoomTypeBySlug(id);
		}
		if (!"active".equals(roomType.getStatus())) {
			throw DomainException.notFound("room type not found");
		}
		requireActiveHotel(roomType.getHotelId());
		return roomType;
	}

	@QueryMapping
	public List<RoomType> roomTypes(@Argument UUID hotelId) {
		requireActiveHotel(hotelId);
		return catalog.activeRoomTypes(hotelId);
	}

	@QueryMapping
	public List<Experience> experiences(@Argument UUID hotelId) {
		requireActiveHotel(hotelId);
		return catalog.experiences(hotelId);
	}

	@QueryMapping
	public List<Restaurant> restaurants(@Argument UUID hotelId) {
		requireActiveHotel(hotelId);
		return catalog.restaurants(hotelId);
	}

	@QueryMapping
	public List<Extra> extras(@Argument UUID hotelId) {
		requireActiveHotel(hotelId);
		return catalog.extras(hotelId);
	}

	@QueryMapping
	public List<Faq> faqs(@Argument UUID hotelId) {
		requireActiveHotel(hotelId);
		return catalog.faqs(hotelId);
	}

	@QueryMapping
	public List<Country> countries() {
		return reference.countries();
	}

	/** Public Hotel type: drafts are not exposed (back-office uses adminHotel). */
	private Hotel requireActiveHotel(UUID id) {
		Hotel hotel = catalog.getHotel(id);
		if (!"active".equals(hotel.getStatus())) {
			throw DomainException.notFound("hotel not found");
		}
		return hotel;
	}

	// ------------------------------------------------------- field resolvers

	@BatchMapping(typeName = "Hotel", field = "media")
	public Map<Hotel, List<Media>> hotelMedia(Collection<Hotel> hotels) {
		Map<UUID, List<Media>> byId = catalog.mediaByHotelIds(
				hotels.stream().map(Hotel::getId).toList());
		return hotels.stream().collect(Collectors.toMap(Function.identity(),
				h -> byId.getOrDefault(h.getId(), List.of())));
	}

	@BatchMapping(typeName = "Hotel", field = "amenities")
	public Map<Hotel, List<Amenity>> hotelAmenities(Collection<Hotel> hotels) {
		Map<UUID, List<Amenity>> byId = catalog.amenitiesByHotelIds(
				hotels.stream().map(Hotel::getId).toList());
		return hotels.stream().collect(Collectors.toMap(Function.identity(),
				h -> byId.getOrDefault(h.getId(), List.of())));
	}

	@BatchMapping(typeName = "Hotel", field = "averageRating")
	public Map<Hotel, Double> hotelAverageRatings(Collection<Hotel> hotels) {
		Map<UUID, Double> byId = review.avgRatingByHotelIds(
				hotels.stream().map(Hotel::getId).toList());
		return hotels.stream().collect(Collectors.toMap(Function.identity(),
				h -> byId.getOrDefault(h.getId(), 0.0)));
	}

	@SchemaMapping(typeName = "Hotel", field = "roomTypes")
	public List<RoomType> hotelRoomTypes(Hotel hotel) {
		return catalog.activeRoomTypes(hotel.getId());
	}

	@SchemaMapping(typeName = "Hotel", field = "checkInTime")
	public String hotelCheckInTime(Hotel hotel) {
		return hotel.getCheckInTime() == null ? null : hotel.getCheckInTime().toString();
	}

	@SchemaMapping(typeName = "Hotel", field = "checkOutTime")
	public String hotelCheckOutTime(Hotel hotel) {
		return hotel.getCheckOutTime() == null ? null : hotel.getCheckOutTime().toString();
	}

	@BatchMapping(typeName = "RoomType", field = "media")
	public Map<RoomType, List<Media>> roomTypeMedia(Collection<RoomType> roomTypes) {
		Map<UUID, List<Media>> byId = catalog.mediaByRoomTypeIds(
				roomTypes.stream().map(RoomType::getId).toList());
		return roomTypes.stream().collect(Collectors.toMap(Function.identity(),
				rt -> byId.getOrDefault(rt.getId(), List.of())));
	}

	@BatchMapping(typeName = "RoomType", field = "hotelName")
	public Map<RoomType, String> roomTypeHotelNames(Collection<RoomType> roomTypes) {
		Map<UUID, String> names = catalog.hotelNamesByIds(
				roomTypes.stream().map(RoomType::getHotelId).toList());
		return roomTypes.stream().collect(Collectors.toMap(Function.identity(),
				rt -> names.get(rt.getHotelId())));
	}

	@BatchMapping(typeName = "RoomType", field = "currencyCode")
	public Map<RoomType, String> roomTypeCurrencies(Collection<RoomType> roomTypes) {
		Map<UUID, String> currencies = catalog.defaultCurrenciesByHotelIds(
				roomTypes.stream().map(RoomType::getHotelId).toList());
		return roomTypes.stream().collect(Collectors.toMap(Function.identity(),
				rt -> currencies.get(rt.getHotelId())));
	}
}
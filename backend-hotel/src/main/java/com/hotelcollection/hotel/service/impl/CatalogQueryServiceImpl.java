package com.hotelcollection.hotel.service.impl;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.function.Function;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.dto.catalog.AdminRoomTypeView;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.dto.catalog.HotelSearchResult;
import com.hotelcollection.hotel.entity.Amenity;
import com.hotelcollection.hotel.entity.Experience;
import com.hotelcollection.hotel.entity.Extra;
import com.hotelcollection.hotel.entity.Faq;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.Restaurant;
import com.hotelcollection.hotel.entity.Room;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.repository.ExperienceRepository;
import com.hotelcollection.hotel.repository.ExtraRepository;
import com.hotelcollection.hotel.repository.FaqRepository;
import com.hotelcollection.hotel.repository.HotelRepository;
import com.hotelcollection.hotel.repository.RestaurantRepository;
import com.hotelcollection.hotel.repository.RoomRepository;
import com.hotelcollection.hotel.repository.RoomTypeRepository;
import com.hotelcollection.hotel.service.MediaQueryService;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.service.PricingService;
import com.hotelcollection.hotel.service.RateQueryService;
import com.hotelcollection.hotel.service.ReviewService;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.dto.PageInput;

/**
 * Catalog read use cases: hotel search (with optional bounded sort), hotel
 * details, room types, experiences, restaurants, faqs, extras, and the
 * batch field loaders used by the GraphQL layer to avoid N+1 queries.
 * Pricing/review/media data is composed via the service layer.
 */
@Service
public class CatalogQueryServiceImpl implements CatalogQueryService {

	/**
	 * Upper bound of hotels sorted in memory (NAME_ASC / PRICE_ASC /
	 * RATING_DESC). Sort is a display concern on a small catalog; beyond
	 * this bound the sort is applied to the first page of matches only
	 * (documented limitation — revisit with DB-level ordering if the
	 * active catalog ever approaches this size).
	 */
	public static final int MAX_SORT_CANDIDATES = 500;

	private final HotelRepository hotelRepository;
	private final RoomTypeRepository roomTypeRepository;
	private final ExperienceRepository experienceRepository;
	private final RestaurantRepository restaurantRepository;
	private final FaqRepository faqRepository;
	private final ExtraRepository extraRepository;
	private final RoomRepository roomRepository;
	private final PricingService pricing;
	private final RateQueryService rate;
	private final ReviewService review;
	private final MediaQueryService media;

	public CatalogQueryServiceImpl(HotelRepository hotelRepository,
			RoomTypeRepository roomTypeRepository, ExperienceRepository experienceRepository,
			RestaurantRepository restaurantRepository, FaqRepository faqRepository,
			ExtraRepository extraRepository, RoomRepository roomRepository,
			PricingService pricing, RateQueryService rate, ReviewService review,
			MediaQueryService media) {
		this.hotelRepository = hotelRepository;
		this.roomTypeRepository = roomTypeRepository;
		this.experienceRepository = experienceRepository;
		this.restaurantRepository = restaurantRepository;
		this.faqRepository = faqRepository;
		this.extraRepository = extraRepository;
		this.roomRepository = roomRepository;
		this.pricing = pricing;
		this.rate = rate;
		this.review = review;
		this.media = media;
	}

	/** Hotel search with from-price + review aggregates (single query, no N+1). */
	@Override
	@Transactional(readOnly = true)
	public HotelSearchResult search(String query, int page, int size, String sort) {
		int safePage = Math.max(page, 0);
		int safeSize = Math.min(Math.max(size, 1), 100);
		String trimmed = query == null || query.isBlank() ? null : query.trim();

		if (sort == null || sort.isBlank()) {
			Pageable pageable = PageRequest.of(safePage, safeSize);
			Page<Hotel> rows = hotelRepository.search(trimmed, pageable);
			return new HotelSearchResult(rows.getTotalElements(), rows.getNumber(), rows.getSize(),
					rows.getContent());
		}
		return sortedSearch(trimmed, safePage, safeSize, sort.trim().toUpperCase());
	}

	private HotelSearchResult sortedSearch(String query, int page, int size, String sort) {
		Page<Hotel> candidates = hotelRepository.search(query, PageRequest.of(0, MAX_SORT_CANDIDATES));
		List<Hotel> hotels = new ArrayList<>(candidates.getContent());
		switch (sort) {
			case "NAME_ASC" -> hotels.sort(Comparator.comparing(Hotel::getName,
					Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)));
			case "PRICE_ASC" -> {
				Map<UUID, Integer> prices = rate.minPriceByHotelIds(hotels.stream().map(Hotel::getId).toList());
				hotels.sort(Comparator.comparing((Hotel h) -> prices.getOrDefault(h.getId(), Integer.MAX_VALUE)));
			}
			case "RATING_DESC" -> {
				Map<UUID, Double> ratings = review.avgRatingByHotelIds(
						hotels.stream().map(Hotel::getId).toList());
				hotels.sort(Comparator.comparing((Hotel h) -> ratings.getOrDefault(h.getId(), 0.0))
						.reversed());
			}
			default -> throw DomainException.validation("unsupported sort: " + sort);
		}
		int from = Math.min(page * size, hotels.size());
		int to = Math.min(from + size, hotels.size());
		return new HotelSearchResult(hotels.size(), page, size, hotels.subList(from, to));
	}

	@Override
	@Transactional(readOnly = true)
	public Hotel getHotel(UUID id) {
		return hotelRepository.findById(id)
				.orElseThrow(() -> DomainException.notFound("hotel not found"));
	}

	@Override
	@Transactional(readOnly = true)
	public Hotel canonicalHotel() {
		List<Hotel> active = hotelRepository.findAllActive();
		if (active.isEmpty()) {
			throw DomainException.notFound("no active hotel");
		}
		if (active.size() > 1) {
			throw DomainException.conflict("more than one active hotel — "
					+ "the platform is a single-property platform");
		}
		return active.get(0);
	}

	@Override
	@Transactional(readOnly = true)
	public boolean hotelExists(UUID id) {
		return hotelRepository.existsById(id);
	}

	@Override
	@Transactional(readOnly = true)
	public RoomType getRoomType(UUID id) {
		return roomTypeRepository.findByIdWithAmenities(id)
				.orElseThrow(() -> DomainException.validation("room type not found"));
	}

	@Override
	@Transactional(readOnly = true)
	public RoomType getRoomTypeBySlug(String slug) {
		return roomTypeRepository.findBySlug(slug)
				.orElseThrow(() -> DomainException.notFound("room type not found"));
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, RoomType> roomTypesByIds(Collection<UUID> ids) {
		Map<UUID, RoomType> map = new HashMap<>();
		for (RoomType rt : roomTypeRepository.findAllById(ids)) {
			map.put(rt.getId(), rt);
		}
		return map;
	}

	@Override
	@Transactional(readOnly = true)
	public List<RoomType> activeRoomTypes(UUID hotelId) {
		return roomTypeRepository.findActiveByHotelId(hotelId);
	}

	@Override
	@Transactional(readOnly = true)
	public List<RoomType> roomTypes(UUID hotelId) {
		hotelRepository.findById(hotelId)
				.orElseThrow(() -> DomainException.notFound("hotel not found"));
		return roomTypeRepository.findByHotelId(hotelId);
	}

	@Override
	@Transactional(readOnly = true)
	public List<Experience> experiences(UUID hotelId) {
		return experienceRepository.findByHotelIdAndStatusOrderBySortOrder(hotelId, "active");
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, Experience> experiencesByIds(Collection<UUID> ids) {
		Map<UUID, Experience> map = new HashMap<>();
		for (Experience experience : experienceRepository.findAllById(ids)) {
			map.put(experience.getId(), experience);
		}
		return map;
	}

	@Override
	@Transactional(readOnly = true)
	public List<Restaurant> restaurants(UUID hotelId) {
		return restaurantRepository.findByHotelIdAndStatusOrderBySortOrder(hotelId, "active");
	}

	@Override
	@Transactional(readOnly = true)
	public List<Faq> faqs(UUID hotelId) {
		return faqRepository.findByHotelIdOrderBySortOrder(hotelId);
	}

	@Override
	@Transactional(readOnly = true)
	public List<Extra> extras(UUID hotelId) {
		return extraRepository.findByHotelIdAndStatusOrderByName(hotelId, "active");
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, Extra> extrasByIds(Collection<UUID> ids) {
		if (ids == null || ids.isEmpty()) {
			return Map.of();
		}
		return extraRepository.findAllById(ids).stream()
				.collect(Collectors.toMap(Extra::getId, Function.identity()));
	}

	@Override
	@Transactional(readOnly = true)
	public List<Hotel> hotelsByPlatformId(UUID platformId) {
		return hotelRepository.findByPlatformId(platformId);
	}

	@Override
	@Transactional(readOnly = true)
	public Page<Hotel> hotelsPaged(boolean allHotels, Collection<UUID> hotelIds, PageInput page) {
		int p = page == null || page.page() == null ? 0 : Math.max(page.page(), 0);
		int s = page == null || page.size() == null ? 20 : Math.min(Math.max(page.size(), 1), 100);
		return allHotels
				? hotelRepository.findAllByOrderByName(PageRequest.of(p, s))
				: hotelRepository.findByIdIn(hotelIds, PageRequest.of(p, s));
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, Long> countRoomTypesByHotelIds(Collection<UUID> ids) {
		return countMap(roomTypeRepository.countByHotelIds(ids));
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, String> hotelNamesByIds(Collection<UUID> ids) {
		if (ids == null || ids.isEmpty()) {
			return Map.of();
		}
		return hotelRepository.findAllById(ids).stream()
				.collect(Collectors.toMap(Hotel::getId, Hotel::getName));
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, String> defaultCurrenciesByHotelIds(Collection<UUID> ids) {
		if (ids == null || ids.isEmpty()) {
			return Map.of();
		}
		return hotelRepository.findAllById(ids).stream()
				.collect(Collectors.toMap(Hotel::getId, Hotel::getDefaultCurrency));
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, String> roomTypeNamesByIds(Collection<UUID> ids) {
		if (ids == null || ids.isEmpty()) {
			return Map.of();
		}
		return roomTypeRepository.findAllById(ids).stream()
				.collect(Collectors.toMap(RoomType::getId, RoomType::getName));
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, String> roomNumbersByIds(Collection<UUID> ids) {
		if (ids == null || ids.isEmpty()) {
			return Map.of();
		}
		return roomRepository.findAllById(ids).stream()
				.collect(Collectors.toMap(Room::getId, Room::getRoomNumber));
	}

	@Override
	@Transactional(readOnly = true)
	public BigDecimal roomTypeFromPrice(UUID hotelId, UUID roomTypeId) {
		return pricing.fromPrice(hotelId, roomTypeId, java.time.LocalDate.now());
	}

	// ------------------------------------------------- batch field loaders

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, List<Media>> mediaByHotelIds(Collection<UUID> ids) {
		return media.findByHotelIds(ids);
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, List<Media>> mediaByRoomTypeIds(Collection<UUID> ids) {
		return media.findByRoomTypeIds(ids);
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, List<Amenity>> amenitiesByHotelIds(Collection<UUID> ids) {
		return hotelRepository.findByIdsWithAmenities(ids).stream()
				.collect(Collectors.toMap(Hotel::getId, Hotel::getAmenities));
	}

	@Override
	@Transactional(readOnly = true)
	public List<AdminRoomTypeView> roomTypeWorkspace(UUID hotelId) {
		List<RoomType> roomTypes = roomTypeRepository.findByHotelId(hotelId);
		List<UUID> roomTypeIds = roomTypes.stream().map(RoomType::getId).toList();
		Map<UUID, List<Media>> mediaByRoomType = roomTypeIds.isEmpty() ? Map.of()
				: media.findByRoomTypeIds(roomTypeIds);
		Map<UUID, List<Room>> roomsByRoomType = roomTypeIds.isEmpty() ? Map.of()
				: roomRepository.findByRoomTypeIdInOrderByRoomNumber(roomTypeIds).stream()
						.collect(Collectors.groupingBy(Room::getRoomTypeId));
		return roomTypes.stream()
				.map(rt -> new AdminRoomTypeView(rt.getId(), rt.getHotelId(), rt.getName(),
						rt.getSlug(), rt.getDescription(), rt.getMaxAdults() == null ? null
								: rt.getMaxAdults().intValue(),
						rt.getMaxChildren() == null ? null : rt.getMaxChildren().intValue(),
						rt.getTotalInventory(),
						rt.getBedConfiguration(), rt.getSizeSqm(), rt.getViewType(),
						rt.getStatus(), rt.getAmenities(),
						mediaByRoomType.getOrDefault(rt.getId(), List.of()),
						roomsByRoomType.getOrDefault(rt.getId(), List.of())))
				.toList();
	}

	private Map<UUID, Long> countMap(List<Object[]> rows) {
		Map<UUID, Long> map = new HashMap<>();
		for (Object[] row : rows) {
			map.put(UUID.fromString(row[0].toString()), ((Number) row[1]).longValue());
		}
		return map;
	}
}
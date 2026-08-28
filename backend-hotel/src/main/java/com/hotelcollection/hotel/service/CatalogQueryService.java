package com.hotelcollection.hotel.service;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;

import com.hotelcollection.hotel.entity.Amenity;
import com.hotelcollection.hotel.entity.Experience;
import com.hotelcollection.hotel.entity.Extra;
import com.hotelcollection.hotel.entity.Faq;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.Restaurant;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.dto.PageInput;
import com.hotelcollection.hotel.dto.catalog.AdminRoomTypeView;
import com.hotelcollection.hotel.dto.catalog.HotelSearchResult;
import com.hotelcollection.hotel.entity.Room;

/**
 * Catalog read use cases. Batch loaders exist so the GraphQL layer can avoid
 * N+1 queries; entities are the API contract (pragmatic ADR).
 */
public interface CatalogQueryService {

	HotelSearchResult search(String query, int page, int size, String sort);

	Hotel getHotel(UUID id);

	/**
	 * The canonical hotel of the platform: the single active hotel. Throws
	 * NOT_FOUND when there is no active hotel and CONFLICT when more than one
	 * hotel is active — the platform is a single-property platform and
	 * availability/inventory are scoped to it.
	 */
	Hotel canonicalHotel();

	boolean hotelExists(UUID id);

	RoomType getRoomType(UUID id);

	RoomType getRoomTypeBySlug(String slug);

	Map<UUID, RoomType> roomTypesByIds(Collection<UUID> ids);

	/** Active room types of a hotel (availability source of truth). */
	List<RoomType> activeRoomTypes(UUID hotelId);

	List<RoomType> roomTypes(UUID hotelId);

	List<Experience> experiences(UUID hotelId);

	Map<UUID, Experience> experiencesByIds(Collection<UUID> ids);

	List<Restaurant> restaurants(UUID hotelId);

	List<Faq> faqs(UUID hotelId);

	List<Extra> extras(UUID hotelId);

	/** Extras by ids (pricing engine loads extras across hotels, then validates). */
	Map<UUID, Extra> extrasByIds(Collection<UUID> ids);

	List<Hotel> hotelsByPlatformId(UUID platformId);

	/** Back-office hotel page (all hotels or a scoped id set), paged. */
	Page<Hotel> hotelsPaged(boolean allHotels, Collection<UUID> hotelIds, PageInput page);

	Map<UUID, Long> countRoomTypesByHotelIds(Collection<UUID> ids);

	Map<UUID, String> hotelNamesByIds(Collection<UUID> ids);

	Map<UUID, String> defaultCurrenciesByHotelIds(Collection<UUID> ids);

	Map<UUID, String> roomTypeNamesByIds(Collection<UUID> ids);

	BigDecimal roomTypeFromPrice(UUID hotelId, UUID roomTypeId);

	Map<UUID, List<Media>> mediaByHotelIds(Collection<UUID> ids);

	Map<UUID, List<Media>> mediaByRoomTypeIds(Collection<UUID> ids);

	Map<UUID, List<Amenity>> amenitiesByHotelIds(Collection<UUID> ids);

	/** Room types of a hotel with media + rooms resolved (admin workspace read). */
	List<AdminRoomTypeView> roomTypeWorkspace(UUID hotelId);
}
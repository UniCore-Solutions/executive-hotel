package com.hotelcollection.hotel.service;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Media;

/** Media read use cases (batch loaders for the GraphQL layer). */
public interface MediaQueryService {

	List<Media> findByHotelId(UUID hotelId);

	List<Media> findByRoomTypeId(UUID roomTypeId);

	List<Media> findByPlatformId(UUID platformId);

	Map<UUID, List<Media>> findByHotelIds(Collection<UUID> ids);

	Map<UUID, List<Media>> findByRoomTypeIds(Collection<UUID> ids);

	List<Media> findByIds(Collection<UUID> ids);
}
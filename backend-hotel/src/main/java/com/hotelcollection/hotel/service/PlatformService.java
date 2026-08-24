package com.hotelcollection.hotel.service;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.entity.Platform;
import com.hotelcollection.hotel.dto.platform.ContentBlockView;

/** Platform read use cases: lookup by slug and content-block assembly. */
public interface PlatformService {

	Platform getPlatform(String slug);

	boolean platformExists(UUID id);

	List<ContentBlockView> contentBlocks(UUID platformId);

	List<Media> mediaByPlatformId(UUID platformId);

	List<Hotel> hotelsByPlatformId(UUID platformId);
}
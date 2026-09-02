package com.hotelcollection.hotel.service;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.dto.media.MediaInput;
import com.hotelcollection.hotel.dto.platform.AdminPlatformInput;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.entity.Platform;

/**
 * Back-office platform (brand) writes. There is exactly one platform row in
 * this single-tenant deployment; every method is gated to {@code super_admin}
 * internally (brand identity is platform-wide, not hotel-scoped).
 */
public interface PlatformAdminService {

	Platform updatePlatform(UUID id, AdminPlatformInput in);

	List<Media> setPlatformMedia(UUID platformId, List<MediaInput> media);
}

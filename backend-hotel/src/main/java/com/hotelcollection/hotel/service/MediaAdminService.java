package com.hotelcollection.hotel.service;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.dto.media.MediaInput;

/**
 * Back-office media writes: replace the media set of a hotel / room type /
 * platform (delete-then-insert semantics, primary uniqueness enforced).
 */
public interface MediaAdminService {

	List<Media> replaceHotelMedia(UUID hotelId, List<MediaInput> media);

	List<Media> replaceRoomTypeMedia(UUID roomTypeId, List<MediaInput> media);

	List<Media> replacePlatformMedia(UUID platformId, List<MediaInput> media);
}
package com.hotelcollection.hotel.service.impl;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.service.MediaAdminService;
import com.hotelcollection.hotel.dto.media.MediaInput;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.repository.MediaRepository;
import com.hotelcollection.hotel.exception.DomainException;

/**
 * Back-office media writes: replace the media set of a hotel / room type
 * (delete-then-insert, per-owner primary uniqueness enforced).
 */
@Service
public class MediaAdminServiceImpl implements MediaAdminService {

	private final MediaRepository mediaRepository;

	public MediaAdminServiceImpl(MediaRepository mediaRepository) {
		this.mediaRepository = mediaRepository;
	}

	@Override
	@Transactional
	public List<Media> replaceHotelMedia(UUID hotelId, List<MediaInput> inputs) {
		mediaRepository.deleteByHotelId(hotelId);
		return replaceMedia(inputs, m -> m.setHotelId(hotelId));
	}

	@Override
	@Transactional
	public List<Media> replaceRoomTypeMedia(UUID roomTypeId, List<MediaInput> inputs) {
		mediaRepository.deleteByRoomTypeId(roomTypeId);
		return replaceMedia(inputs, m -> m.setRoomTypeId(roomTypeId));
	}

	private List<Media> replaceMedia(List<MediaInput> inputs,
			java.util.function.Consumer<Media> owner) {
		if (inputs == null) {
			inputs = List.of();
		}
		List<Media> created = new ArrayList<>();
		Instant now = Instant.now();
		Media primary = null;
		for (MediaInput in : inputs) {
			if (in.url() == null || in.url().isBlank()) {
				throw DomainException.validation("media url is required");
			}
			Media media = new Media();
			owner.accept(media);
			media.setUrl(in.url().trim());
			media.setAltText(in.altText());
			media.setCategory(in.category());
			media.setPrimary(in.isPrimary() != null && in.isPrimary());
			media.setSortOrder(in.sortOrder() == null ? 0 : in.sortOrder().shortValue());
			media.setCreatedAt(now);
			if (media.isPrimary()) {
				if (primary != null) {
					throw DomainException.validation("only one primary media row is allowed");
				}
				primary = media;
			}
			created.add(media);
		}
		return mediaRepository.saveAll(created);
	}
}
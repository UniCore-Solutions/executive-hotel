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
 *
 * <p>The hotel/platform logo ({@link Media#CATEGORY_LOGO}) is deliberately
 * excluded from this replace-all: it has its own dedicated single-item
 * upload/delete path ({@code MediaStorageService}, {@code category="logo"}),
 * so a gallery save here can neither wipe it (by omission from the
 * submitted list) nor duplicate it (a stray logo-category row in the
 * input is dropped, not inserted) — the logo keeps real, single-owner
 * identity independent of whatever the gallery UI happens to submit.
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
		mediaRepository.deleteByHotelIdExceptCategory(hotelId, Media.CATEGORY_LOGO);
		return replaceMedia(inputs, m -> m.setHotelId(hotelId));
	}

	@Override
	@Transactional
	public List<Media> replaceRoomTypeMedia(UUID roomTypeId, List<MediaInput> inputs) {
		mediaRepository.deleteByRoomTypeId(roomTypeId);
		return replaceMedia(inputs, m -> m.setRoomTypeId(roomTypeId));
	}

	@Override
	@Transactional
	public List<Media> replacePlatformMedia(UUID platformId, List<MediaInput> inputs) {
		mediaRepository.deleteByPlatformIdExceptCategory(platformId, Media.CATEGORY_LOGO);
		return replaceMedia(inputs, m -> m.setPlatformId(platformId));
	}

	private List<Media> replaceMedia(List<MediaInput> inputs,
			java.util.function.Consumer<Media> owner) {
		if (inputs == null) {
			inputs = List.of();
		}
		inputs = inputs.stream().filter(in -> !Media.CATEGORY_LOGO.equals(in.category())).toList();
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
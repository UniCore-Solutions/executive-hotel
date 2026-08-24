package com.hotelcollection.hotel.service.impl;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.service.MediaQueryService;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.repository.MediaRepository;

/** Media reads (batch loaders for the GraphQL layer). */
@Service
public class MediaQueryServiceImpl implements MediaQueryService {

	private final MediaRepository mediaRepository;

	public MediaQueryServiceImpl(MediaRepository mediaRepository) {
		this.mediaRepository = mediaRepository;
	}

	@Override
	@Transactional(readOnly = true)
	public List<Media> findByHotelId(UUID hotelId) {
		return mediaRepository.findByHotelId(hotelId);
	}

	@Override
	@Transactional(readOnly = true)
	public List<Media> findByRoomTypeId(UUID roomTypeId) {
		return mediaRepository.findByRoomTypeId(roomTypeId);
	}

	@Override
	@Transactional(readOnly = true)
	public List<Media> findByPlatformId(UUID platformId) {
		return mediaRepository.findByPlatformId(platformId);
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, List<Media>> findByHotelIds(Collection<UUID> ids) {
		return mediaRepository.findByHotelIds(ids).stream()
				.collect(Collectors.groupingBy(Media::getHotelId));
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, List<Media>> findByRoomTypeIds(Collection<UUID> ids) {
		return mediaRepository.findByRoomTypeIds(ids).stream()
				.collect(Collectors.groupingBy(Media::getRoomTypeId));
	}

	@Override
	@Transactional(readOnly = true)
	public List<Media> findByIds(Collection<UUID> ids) {
		return mediaRepository.findAllById(ids);
	}
}
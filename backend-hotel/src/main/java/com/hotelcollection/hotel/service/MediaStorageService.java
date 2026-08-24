package com.hotelcollection.hotel.service;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Media;

/**
 * Media upload/delete use cases (bytes to the storage provider, metadata
 * row in PostgreSQL, owner-typed with per-owner primary uniqueness).
 */
public interface MediaStorageService {

	Media upload(byte[] content, String originalName, String contentType, String ownerType,
			UUID ownerId, String altText, String caption, String category, boolean isPrimary);

	void delete(UUID mediaId);
}
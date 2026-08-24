package com.hotelcollection.hotel.service.impl;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.service.MediaStorageService;
import com.hotelcollection.hotel.repository.MediaRepository;
import com.hotelcollection.hotel.storage.MediaStorageProvider;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.service.PlatformService;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.entity.Platform;

/**
 * Media upload/delete use cases. Bytes go to the MediaStorageProvider; the
 * metadata row (url, storage_key, owner) lives in PostgreSQL. Uploads are
 * owner-typed (platform | hotel this phase) and respect the per-owner primary
 * uniqueness rule: uploading a new primary replaces the previous one (file +
 * row), mirroring the setHotelMedia semantics. Owner existence checks go
 * through the catalog/platform services.
 *
 * <p>Authorization: uploads and deletes are owner-scoped writes. Platform
 * media requires super_admin; hotel media requires a staff member of that
 * hotel (or super_admin). A plain guest cannot upload to or delete media of
 * hotels they do not staff.
 */
@Service
public class MediaStorageServiceImpl implements MediaStorageService {

	private static final int PRIMARY_SORT_ORDER = 0;

	private final MediaStorageProvider storage;
	private final MediaRepository mediaRepository;
	private final PlatformService platform;
	private final CatalogQueryService catalog;
	private final CurrentUserAccessor currentUser;
	private final String baseUrl;

	public MediaStorageServiceImpl(MediaStorageProvider storage, MediaRepository mediaRepository,
			PlatformService platform, CatalogQueryService catalog,
			CurrentUserAccessor currentUser,
			@Value("${app.media.base-url:http://localhost:8080}") String baseUrl) {
		this.storage = storage;
		this.mediaRepository = mediaRepository;
		this.platform = platform;
		this.catalog = catalog;
		this.currentUser = currentUser;
		this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
	}

	@Override
	@Transactional
	public Media upload(byte[] content, String originalName, String contentType, String ownerType,
			UUID ownerId, String altText, String caption, String category, boolean isPrimary) {
		Owner owner = Owner.of(ownerType, ownerId, this);
		owner.requireExists();
		requireOwnerAccess(owner.type, owner.id);

		String storageKey = storage.store(content, originalName, contentType);
		try {
			if (isPrimary) {
				owner.deleteExistingPrimary();
			}
			Media media = new Media();
			media.setUrl(baseUrl + "/media/" + storageKey);
			media.setStorageKey(storageKey);
			media.setAltText(altText);
			media.setCaption(caption);
			media.setCategory(category);
			media.setMimeType(storage.mimeTypeOf(content));
			media.setWidth(null);
			media.setHeight(null);
			applyDimensions(media, content);
			owner.assign(media);
			media.setPrimary(isPrimary);
			media.setSortOrder(isPrimary ? PRIMARY_SORT_ORDER : nextSortOrder(owner));
			media.setCreatedAt(Instant.now());
			mediaRepository.saveAndFlush(media);
			return media;
		} catch (RuntimeException ex) {
			storage.delete(storageKey);
			throw ex;
		}
	}

	@Override
	@Transactional
	public void delete(UUID mediaId) {
		Media media = mediaRepository.findById(mediaId)
				.orElseThrow(() -> DomainException.notFound("media not found"));
		requireOwnerAccess(media.getPlatformId() != null ? "platform" : "hotel",
				media.getPlatformId() != null ? media.getPlatformId() : media.getHotelId());
		mediaRepository.delete(media);
		storage.delete(media.getStorageKey());
	}

	/**
	 * Owner-scoped write check: platform media requires super_admin; hotel
	 * media requires super_admin or membership of that hotel.
	 */
	private void requireOwnerAccess(String ownerType, UUID ownerId) {
		CurrentUser actor = currentUser.require();
		boolean allowed = "platform".equals(ownerType)
				? actor.hasRole("super_admin")
				: actor.inHotel(ownerId);
		if (!allowed) {
			throw DomainException.forbidden(
					"no permission to manage media of " + ownerType + " " + ownerId);
		}
	}

	private void applyDimensions(Media media, byte[] content) {
		try {
			BufferedImage image = ImageIO.read(new ByteArrayInputStream(content));
			if (image != null) {
				media.setWidth(image.getWidth());
				media.setHeight(image.getHeight());
			}
		} catch (Exception ignored) {
			// dimensions are best-effort (e.g. webp is not decodable by ImageIO)
		}
	}

	private short nextSortOrder(Owner owner) {
		int max = owner.media().stream()
				.mapToInt(Media::getSortOrder)
				.max()
				.orElse(PRIMARY_SORT_ORDER);
		return (short) (max + 1);
	}

	/** Owner-typed media handling (platform | hotel for this phase). */
	private static final class Owner {

		private final MediaStorageServiceImpl service;
		private final String type;
		private final UUID id;

		private Owner(MediaStorageServiceImpl service, String type, UUID id) {
			this.service = service;
			this.type = type;
			this.id = id;
		}

		static Owner of(String type, UUID id, MediaStorageServiceImpl service) {
			String normalized = type == null ? null : type.trim().toLowerCase();
			if (id == null || !"platform".equals(normalized) && !"hotel".equals(normalized)) {
				throw DomainException.validation("ownerType must be 'platform' or 'hotel'");
			}
			return new Owner(service, normalized, id);
		}

		void requireExists() {
			boolean exists = "platform".equals(type)
					? service.platform.platformExists(id)
					: service.catalog.hotelExists(id);
			if (!exists) {
				throw DomainException.notFound(type + " not found: " + id);
			}
		}

		void assign(Media media) {
			if ("platform".equals(type)) {
				media.setPlatformId(id);
			} else {
				media.setHotelId(id);
			}
		}

		void deleteExistingPrimary() {
			Media primary = primary();
			if (primary != null) {
				if ("platform".equals(type)) {
					service.mediaRepository.deletePrimaryByPlatformId(id);
				} else {
					service.mediaRepository.deletePrimaryByHotelId(id);
				}
				service.storage.delete(primary.getStorageKey());
			}
		}

		Media primary() {
			return media().stream().filter(Media::isPrimary).findFirst().orElse(null);
		}

		List<Media> media() {
			return "platform".equals(type)
					? service.mediaRepository.findByPlatformId(id)
					: service.mediaRepository.findByHotelId(id);
		}
	}
}
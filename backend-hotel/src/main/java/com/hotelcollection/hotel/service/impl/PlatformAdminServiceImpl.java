package com.hotelcollection.hotel.service.impl;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.dto.media.MediaInput;
import com.hotelcollection.hotel.dto.platform.AdminPlatformInput;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.entity.Platform;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.repository.PlatformRepository;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.service.AuditService;
import com.hotelcollection.hotel.service.MediaAdminService;
import com.hotelcollection.hotel.service.PlatformAdminService;
import com.hotelcollection.hotel.service.ReferenceQueryService;

/**
 * Back-office platform (brand) writes: update identity fields and replace
 * the platform's media set. Mirrors CatalogAdminServiceImpl's hotel-update
 * shape ("nullable fields stay unchanged on update"), gated to super_admin
 * instead of hotel-scoped staff since a platform is not hotel-scoped.
 */
@Service
public class PlatformAdminServiceImpl implements PlatformAdminService {

	private final PlatformRepository platformRepository;
	private final MediaAdminService mediaAdmin;
	private final ReferenceQueryService reference;
	private final AuditService audit;
	private final CurrentUserAccessor currentUser;

	public PlatformAdminServiceImpl(PlatformRepository platformRepository,
			MediaAdminService mediaAdmin, ReferenceQueryService reference, AuditService audit,
			CurrentUserAccessor currentUser) {
		this.platformRepository = platformRepository;
		this.mediaAdmin = mediaAdmin;
		this.reference = reference;
		this.audit = audit;
		this.currentUser = currentUser;
	}

	@Override
	@Transactional
	public Platform updatePlatform(UUID id, AdminPlatformInput in) {
		CurrentUser actor = currentUser.requireSuperAdmin();
		Platform platform = platformRepository.findById(id)
				.orElseThrow(() -> DomainException.notFound("platform not found"));
		if (in.name() != null) {
			platform.setName(required(in.name(), "name"));
		}
		applyIfPresent(in.tagline(), platform::setTagline);
		applyIfPresent(in.description(), platform::setDescription);
		applyIfPresent(in.contactEmail(), platform::setContactEmail);
		applyIfPresent(in.contactPhone(), platform::setContactPhone);
		if (in.defaultCurrency() != null) {
			platform.setDefaultCurrency(validateCurrency(in.defaultCurrency()));
		}
		if (in.status() != null) {
			platform.setStatus(validStatus(in.status()));
		}
		platform.setUpdatedAt(Instant.now());
		try {
			platformRepository.saveAndFlush(platform);
		} catch (DataIntegrityViolationException ex) {
			throw DomainException.validation("invalid reference data (currency)");
		}
		audit.record(actor, "platform.updated", "platform", platform.getId(), null,
				Map.of("name", platform.getName()));
		return platform;
	}

	@Override
	@Transactional
	public List<Media> setPlatformMedia(UUID platformId, List<MediaInput> inputs) {
		CurrentUser actor = currentUser.requireSuperAdmin();
		if (!platformRepository.existsById(platformId)) {
			throw DomainException.notFound("platform not found");
		}
		List<Media> media = mediaAdmin.replacePlatformMedia(platformId, inputs);
		audit.record(actor, "platform.media.updated", "platform", platformId, null,
				Map.of("count", media.size()));
		return media;
	}

	private String required(String value, String field) {
		if (value == null || value.isBlank()) {
			throw DomainException.validation(field + " is required");
		}
		return value;
	}

	private <T> void applyIfPresent(T value, java.util.function.Consumer<T> setter) {
		if (value != null) {
			setter.accept(value);
		}
	}

	private String validateCurrency(String code) {
		String trimmed = required(code, "defaultCurrency").trim().toUpperCase();
		if (!reference.currencyExists(trimmed)) {
			throw DomainException.validation("unknown currency: " + trimmed);
		}
		return trimmed;
	}

	private String validStatus(String status) {
		if (!List.of("active", "inactive", "draft").contains(status)) {
			throw DomainException.validation("invalid platform status");
		}
		return status;
	}
}

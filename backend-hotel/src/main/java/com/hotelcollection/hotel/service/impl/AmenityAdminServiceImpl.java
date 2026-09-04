package com.hotelcollection.hotel.service.impl;

import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.dto.catalog.AdminAmenityInput;
import com.hotelcollection.hotel.entity.Amenity;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.repository.AmenityRepository;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.service.AmenityAdminService;
import com.hotelcollection.hotel.service.AuditService;

@Service
public class AmenityAdminServiceImpl implements AmenityAdminService {

	private final AmenityRepository amenityRepository;
	private final AuditService audit;
	private final CurrentUserAccessor currentUser;

	public AmenityAdminServiceImpl(AmenityRepository amenityRepository, AuditService audit,
			CurrentUserAccessor currentUser) {
		this.amenityRepository = amenityRepository;
		this.audit = audit;
		this.currentUser = currentUser;
	}

	@Override
	@Transactional
	public Amenity createAmenity(AdminAmenityInput in) {
		CurrentUser actor = currentUser.requireHotelAdminOrSuperAdmin();
		String name = required(in.name(), "name");
		if (amenityRepository.existsByNameIgnoreCase(name)) {
			throw DomainException.conflict("an amenity named '" + name + "' already exists");
		}
		Amenity amenity = new Amenity();
		amenity.setName(name);
		amenity.setIcon(in.icon());
		amenity.setCategory(in.category());
		amenity.setActive(in.isActive() == null || in.isActive());
		amenityRepository.saveAndFlush(amenity);
		audit.record(actor, "amenity.created", "amenity", amenity.getId(), null,
				Map.of("name", amenity.getName()));
		return amenity;
	}

	@Override
	@Transactional
	public Amenity updateAmenity(UUID id, AdminAmenityInput in) {
		CurrentUser actor = currentUser.requireHotelAdminOrSuperAdmin();
		Amenity amenity = amenityRepository.findById(id)
				.orElseThrow(() -> DomainException.notFound("amenity not found"));
		if (in.name() != null) {
			String name = required(in.name(), "name");
			if (amenityRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
				throw DomainException.conflict("an amenity named '" + name + "' already exists");
			}
			amenity.setName(name);
		}
		applyIfPresent(in.icon(), amenity::setIcon);
		applyIfPresent(in.category(), amenity::setCategory);
		if (in.isActive() != null) {
			amenity.setActive(in.isActive());
		}
		amenityRepository.saveAndFlush(amenity);
		audit.record(actor, "amenity.updated", "amenity", amenity.getId(), null,
				Map.of("name", amenity.getName()));
		return amenity;
	}

	private String required(String value, String field) {
		if (value == null || value.isBlank()) {
			throw DomainException.validation(field + " is required");
		}
		return value.trim();
	}

	private <T> void applyIfPresent(T value, java.util.function.Consumer<T> setter) {
		if (value != null) {
			setter.accept(value);
		}
	}
}

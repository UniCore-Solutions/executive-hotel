package com.hotelcollection.hotel.service.impl;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.dto.catalog.AdminSeasonInput;
import com.hotelcollection.hotel.entity.Season;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.repository.SeasonRepository;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.service.AuditService;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.service.SeasonService;

@Service
public class SeasonServiceImpl implements SeasonService {

	private static final Set<String> SEASON_TYPES = Set.of("high", "low", "shoulder", "custom");

	private final SeasonRepository seasonRepository;
	private final CatalogQueryService catalog;
	private final AuditService audit;
	private final CurrentUserAccessor currentUser;

	public SeasonServiceImpl(SeasonRepository seasonRepository, CatalogQueryService catalog,
			AuditService audit, CurrentUserAccessor currentUser) {
		this.seasonRepository = seasonRepository;
		this.catalog = catalog;
		this.audit = audit;
		this.currentUser = currentUser;
	}

	@Override
	@Transactional(readOnly = true)
	public List<Season> listSeasons(UUID hotelId) {
		currentUser.requireHotelAccess(hotelId);
		return seasonRepository.findByHotelIdOrderByStartDateAsc(hotelId);
	}

	@Override
	@Transactional
	public Season createSeason(UUID hotelId, AdminSeasonInput in) {
		CurrentUser actor = currentUser.requireHotelAccess(hotelId);
		if (!catalog.hotelExists(hotelId)) {
			throw DomainException.notFound("hotel not found");
		}
		Season season = new Season();
		season.setHotelId(hotelId);
		season.setName(required(in.name(), "name"));
		season.setSeasonType(validSeasonType(in.seasonType()));
		validateRange(in.startDate(), in.endDate());
		season.setStartDate(in.startDate());
		season.setEndDate(in.endDate());
		season.setActive(in.isActive() == null || in.isActive());
		season.setColor(in.color());
		season.setNotes(in.notes());
		Instant now = Instant.now();
		season.setCreatedAt(now);
		season.setUpdatedAt(now);
		save(season);
		audit.record(actor, "season.created", "season", season.getId(), hotelId,
				Map.of("name", season.getName()));
		return season;
	}

	@Override
	@Transactional
	public Season updateSeason(UUID id, AdminSeasonInput in) {
		Season season = seasonRepository.findById(id)
				.orElseThrow(() -> DomainException.notFound("season not found"));
		CurrentUser actor = currentUser.requireHotelAccess(season.getHotelId());
		if (in.name() != null) {
			season.setName(required(in.name(), "name"));
		}
		if (in.seasonType() != null) {
			season.setSeasonType(validSeasonType(in.seasonType()));
		}
		LocalDate nextStart = in.startDate() != null ? in.startDate() : season.getStartDate();
		LocalDate nextEnd = in.endDate() != null ? in.endDate() : season.getEndDate();
		if (in.startDate() != null || in.endDate() != null) {
			validateRange(nextStart, nextEnd);
			season.setStartDate(nextStart);
			season.setEndDate(nextEnd);
		}
		if (in.isActive() != null) {
			season.setActive(in.isActive());
		}
		if (in.color() != null) {
			season.setColor(in.color());
		}
		if (in.notes() != null) {
			season.setNotes(in.notes());
		}
		season.setUpdatedAt(Instant.now());
		save(season);
		audit.record(actor, "season.updated", "season", season.getId(), season.getHotelId(),
				Map.of("name", season.getName()));
		return season;
	}

	@Override
	@Transactional
	public void deleteSeason(UUID id) {
		Season season = seasonRepository.findById(id)
				.orElseThrow(() -> DomainException.notFound("season not found"));
		CurrentUser actor = currentUser.requireHotelAccess(season.getHotelId());
		seasonRepository.delete(season);
		audit.record(actor, "season.deleted", "season", id, season.getHotelId(),
				Map.of("name", season.getName()));
	}

	private void save(Season season) {
		try {
			seasonRepository.saveAndFlush(season);
		} catch (DataIntegrityViolationException ex) {
			throw DomainException.conflict("this date range overlaps an existing active season");
		}
	}

	private void validateRange(LocalDate start, LocalDate end) {
		if (start == null || end == null || end.isBefore(start)) {
			throw DomainException.validation("invalid season date range");
		}
	}

	private String validSeasonType(String type) {
		if (type == null) {
			return "custom";
		}
		String normalized = type.trim().toLowerCase();
		if (!SEASON_TYPES.contains(normalized)) {
			throw DomainException.validation("seasonType must be one of " + SEASON_TYPES);
		}
		return normalized;
	}

	private String required(String value, String field) {
		if (value == null || value.isBlank()) {
			throw DomainException.validation(field + " is required");
		}
		return value.trim();
	}
}

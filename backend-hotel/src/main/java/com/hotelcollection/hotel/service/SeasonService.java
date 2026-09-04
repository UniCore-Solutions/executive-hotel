package com.hotelcollection.hotel.service;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.dto.catalog.AdminSeasonInput;
import com.hotelcollection.hotel.entity.Season;

/**
 * Hotel-scoped season CRUD (calendar/definition only — see {@link Season}'s
 * class doc for what this deliberately does not do). Authorization
 * (hotel-scoped staff or super_admin) is enforced internally via
 * {@code CurrentUserAccessor.requireHotelAccess}.
 */
public interface SeasonService {

	List<Season> listSeasons(UUID hotelId);

	Season createSeason(UUID hotelId, AdminSeasonInput in);

	Season updateSeason(UUID id, AdminSeasonInput in);

	void deleteSeason(UUID id);
}

package com.hotelcollection.hotel.service.impl;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.dto.availability.AvailabilityInput;
import com.hotelcollection.hotel.service.AvailabilityService;
import com.hotelcollection.hotel.dto.availability.AvailabilityStatus;
import com.hotelcollection.hotel.dto.availability.RoomAvailability;
import com.hotelcollection.hotel.entity.Availability;
import com.hotelcollection.hotel.repository.AvailabilityRepository;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.util.Validation;

/**
 * Availability read model (C9): single inventory source. A room type is
 * available for a stay when every night of the stay has at least
 * {@code rooms} free units (the requested number of rooms); "few" when the
 * tightest night has at most 2 free units AND some inventory has already
 * gone ({@code minFree < total}).
 *
 * <p>The scarcity rule keys off units actually sold, not the size of the
 * room type. An untouched type is always "available" — a 2-room suite with
 * both units free is not "few rooms left" — but once one of those two sells,
 * the remaining unit is genuinely scarce and is labelled as such. An earlier
 * {@code total > 2} guard suppressed the label entirely for types with two
 * or fewer units, so their last free unit was indistinguishable from full
 * availability.
 */
@Service
public class AvailabilityServiceImpl implements AvailabilityService {

	private final AvailabilityRepository availabilityRepository;
	private final CatalogQueryService catalog;

	public AvailabilityServiceImpl(AvailabilityRepository availabilityRepository,
			CatalogQueryService catalog) {
		this.availabilityRepository = availabilityRepository;
		this.catalog = catalog;
	}

	@Override
	@Transactional(readOnly = true)
	public List<RoomAvailability> check(AvailabilityInput in) {
		// Must be strictly after: a zero-night stay (checkOut == checkIn) would
		// leave the night loop below with nothing to inspect, so every room type
		// would fall through as "available" even when fully sold out.
		if (!in.checkOutDate().isAfter(in.checkInDate())) {
			throw DomainException.validation("checkOutDate must be after checkInDate");
		}
		Validation.requirePositive(in.rooms(), "rooms");
		Validation.requirePositive(in.adults(), "adults");
		if (in.children() < 0) {
			throw DomainException.validation("children cannot be negative");
		}
		List<RoomType> roomTypes = catalog.activeRoomTypes(in.hotelId());
		if (roomTypes.isEmpty()) {
			return List.of();
		}
		List<UUID> ids = roomTypes.stream().map(RoomType::getId).toList();
		List<Availability> rows = availabilityRepository.findByRoomTypeIdsAndRange(ids,
				in.checkInDate(), in.checkOutDate().minusDays(1));
		Map<UUID, Map<LocalDate, Availability>> byRoomType = rows.stream().collect(Collectors.groupingBy(
				Availability::getRoomTypeId,
				Collectors.toMap(Availability::getStayDate, a -> a)));

		int nightsCount = (int) java.time.temporal.ChronoUnit.DAYS.between(in.checkInDate(),
				in.checkOutDate());
		List<RoomAvailability> result = new ArrayList<>();
		for (RoomType roomType : roomTypes) {
			boolean capacityFits = in.adults() <= roomType.getMaxAdults()
					&& in.children() <= roomType.getMaxChildren();
			int total = roomType.getTotalInventory();
			Map<LocalDate, Availability> nights = byRoomType.getOrDefault(roomType.getId(), Map.of());
			int minFree = Integer.MAX_VALUE;
			for (int i = 0; i < nightsCount; i++) {
				Availability a = nights.get(in.checkInDate().plusDays(i));
				int free = a == null ? total : a.free(total);
				minFree = Math.min(minFree, free);
			}
			AvailabilityStatus status;
			if (minFree < in.rooms()) {
				status = AvailabilityStatus.soldout;
			} else if (minFree <= 2 && minFree < total) {
				status = AvailabilityStatus.few;
			} else {
				status = AvailabilityStatus.available;
			}
			result.add(new RoomAvailability(roomType.getId(), status != AvailabilityStatus.soldout,
					status, capacityFits, minFree));
		}
		return result;
	}

	/** Inventory rows of a hotel for the given range (admin back-office read). */
	@Override
	@Transactional(readOnly = true)
	public List<Availability> range(UUID hotelId, LocalDate from, LocalDate to) {
		return availabilityRepository.findByHotelIdAndRange(hotelId, from, to);
	}

	@Override
	@Transactional(readOnly = true)
	public int maxSoldUnits(UUID roomTypeId) {
		return availabilityRepository.maxSoldUnits(roomTypeId);
	}
}
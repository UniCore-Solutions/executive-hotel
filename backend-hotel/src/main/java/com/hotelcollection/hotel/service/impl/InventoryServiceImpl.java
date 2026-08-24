package com.hotelcollection.hotel.service.impl;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.UUID;

import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.service.InventoryService;
import com.hotelcollection.hotel.entity.Availability;
import com.hotelcollection.hotel.repository.AvailabilityRepository;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.exception.DomainException;

/**
 * Inventory locking/selling used by the booking flow within the
 * booking transaction. Sparse model: missing rows mean fully available;
 * concurrent bookings serialize on the row lock after the on-conflict
 * upsert (ensureRow), matching the original BookingServiceImpl semantics.
 */
@Service
public class InventoryServiceImpl implements InventoryService {

	private final AvailabilityRepository availabilityRepository;
	private final CatalogQueryService catalog;

	public InventoryServiceImpl(AvailabilityRepository availabilityRepository,
			@Lazy CatalogQueryService catalog) {
		this.availabilityRepository = availabilityRepository;
		this.catalog = catalog;
	}

	@Override
	@Transactional
	public void lockAndSell(UUID hotelId, List<InventoryRequirement> requirements,
			LocalDate checkIn, int nights) {
		Map<UUID, Integer> unitsByRoomType = requirements.stream()
				.collect(Collectors.toMap(InventoryRequirement::roomTypeId,
						InventoryRequirement::units, Integer::sum));
		LocalDate from = checkIn;
		LocalDate to = checkIn.plusDays(nights - 1);
		// sparse model: materialize only the nights of this stay, then lock them.
		Map<UUID, Integer> totalByRoomType = new java.util.HashMap<>();
		for (UUID roomTypeId : unitsByRoomType.keySet()) {
			RoomType rt = catalog.getRoomType(roomTypeId);
			if (!rt.getHotelId().equals(hotelId)) {
				throw DomainException.conflict("room type does not belong to this hotel");
			}
			totalByRoomType.put(roomTypeId, rt.getTotalInventory());
			for (int i = 0; i < nights; i++) {
				availabilityRepository.ensureRow(roomTypeId, from.plusDays(i));
			}
		}
		List<Availability> rows = availabilityRepository.lockByRoomTypeIdsAndRange(
				unitsByRoomType.keySet(), from, to);
		for (Availability a : rows) {
			int needed = unitsByRoomType.get(a.getRoomTypeId());
			try {
				a.sell(needed, totalByRoomType.get(a.getRoomTypeId()));
			} catch (IllegalStateException ex) {
				throw DomainException.conflict("no availability left for the selected stay dates");
			}
		}
	}

	@Override
	@Transactional
	public void release(UUID hotelId, List<InventoryRequirement> requirements, LocalDate checkIn,
			int nights) {
		Map<UUID, Integer> unitsByRoomType = requirements.stream()
				.collect(Collectors.toMap(InventoryRequirement::roomTypeId,
						InventoryRequirement::units, Integer::sum));
		List<Availability> rows = availabilityRepository.lockByRoomTypeIdsAndRange(
				unitsByRoomType.keySet(), checkIn, checkIn.plusDays(nights - 1));
		// sparse model: once a night is fully released (nothing sold, nothing
		// blocked), the row carries no information and is removed.
		List<Availability> toDelete = new ArrayList<>();
		for (Availability a : rows) {
			a.release(unitsByRoomType.get(a.getRoomTypeId()));
			if (a.isEmpty()) {
				toDelete.add(a);
			}
		}
		if (!toDelete.isEmpty()) {
			availabilityRepository.deleteAll(toDelete);
		}
	}
}
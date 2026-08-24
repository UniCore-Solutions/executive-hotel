package com.hotelcollection.hotel.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.service.AuditService;
import com.hotelcollection.hotel.service.AvailabilityAdminService;
import com.hotelcollection.hotel.dto.availability.AvailabilityRangeInput;
import com.hotelcollection.hotel.dto.availability.AvailabilityUpdateInput;
import com.hotelcollection.hotel.entity.Availability;
import com.hotelcollection.hotel.repository.AvailabilityRepository;
import com.hotelcollection.hotel.service.CatalogAdminService;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.exception.DomainException;

/**
 * Back-office availability write use cases (sparse inventory model: a row
 * with nothing sold/blocked carries no information and is removed).
 * Authorization (hotel staff) is enforced internally; room-type inventory
 * writes are delegated to the catalog services.
 */
@Service
public class AvailabilityAdminServiceImpl implements AvailabilityAdminService {

	private final AvailabilityRepository availabilityRepository;
	private final CatalogQueryService catalog;
	private final CatalogAdminService catalogAdmin;
	private final AuditService audit;
	private final CurrentUserAccessor currentUser;

	public AvailabilityAdminServiceImpl(AvailabilityRepository availabilityRepository,
			CatalogQueryService catalog, CatalogAdminService catalogAdmin, AuditService audit,
			CurrentUserAccessor currentUser) {
		this.availabilityRepository = availabilityRepository;
		this.catalog = catalog;
		this.catalogAdmin = catalogAdmin;
		this.audit = audit;
		this.currentUser = currentUser;
	}

	@Override
	@Transactional
	public List<Availability> updateAvailability(UUID hotelId, List<AvailabilityUpdateInput> rows) {
		CurrentUser actor = requireStaffAccess(hotelId);
		if (rows == null || rows.isEmpty()) {
			throw DomainException.validation("at least one availability row is required");
		}
		List<Availability> updated = new ArrayList<>();
		for (AvailabilityUpdateInput in : rows) {
			RoomType rt = catalog.getRoomType(in.roomTypeId());
			if (!rt.getHotelId().equals(hotelId)) {
				throw DomainException.validation("room type does not belong to this hotel");
			}
			if (in.stayDate() == null) {
				throw DomainException.validation("stayDate is required");
			}
			if (in.totalInventory() != null) {
				rt = catalogAdmin.setRoomTypeInventory(in.roomTypeId(),
						nonNegative(in.totalInventory(), "totalInventory"));
			}
			Availability row = availabilityRepository
					.findByRoomTypeIdAndStayDate(in.roomTypeId(), in.stayDate())
					.orElseGet(() -> {
						Availability created = new Availability();
						created.setRoomTypeId(in.roomTypeId());
						created.setStayDate(in.stayDate());
						created.setRoomsSold(0);
						created.setOutOfOrder(0);
						created.setBlocked(0);
						return created;
					});
			if (in.outOfOrder() != null) {
				row.setOutOfOrder(nonNegative(in.outOfOrder(), "outOfOrder"));
			}
			if (in.blocked() != null) {
				row.setBlocked(nonNegative(in.blocked(), "blocked"));
			}
			if (row.getRoomsSold() + row.getOutOfOrder() + row.getBlocked()
					> rt.getTotalInventory()) {
				throw DomainException.conflict(
						"capacity exceeded: sold + out of order + blocked cannot exceed inventory");
			}
			// sparse model: a row with nothing sold/blocked carries no information
			if (row.isEmpty()) {
				if (row.getId() != null) {
					availabilityRepository.delete(row);
				}
				continue;
			}
			updated.add(availabilityRepository.save(row));
		}
		audit.record(actor, "availability.updated", "hotel", hotelId, hotelId,
				Map.of("rows", rows.size()));
		return updated;
	}

	@Override
	@Transactional
	public List<Availability> updateAvailabilityRange(UUID hotelId, AvailabilityRangeInput in) {
		CurrentUser actor = requireStaffAccess(hotelId);
		if (in == null || in.roomTypeId() == null) {
			throw DomainException.validation("roomTypeId is required");
		}
		RoomType rt = catalog.getRoomType(in.roomTypeId());
		if (!rt.getHotelId().equals(hotelId)) {
			throw DomainException.validation("room type does not belong to this hotel");
		}
		if (in.fromDate() == null || in.toDate() == null) {
			throw DomainException.validation("fromDate and toDate are required");
		}
		if (in.toDate().isBefore(in.fromDate())) {
			throw DomainException.validation("toDate must not be before fromDate");
		}
		if (in.totalInventory() != null) {
			rt = catalogAdmin.setRoomTypeInventory(in.roomTypeId(),
					nonNegative(in.totalInventory(), "totalInventory"));
		}
		List<Availability> updated = new ArrayList<>();
		final RoomType roomType = rt;
		java.time.LocalDate cursor = in.fromDate();
		while (!cursor.isAfter(in.toDate())) {
			final java.time.LocalDate day = cursor;
			Availability row = availabilityRepository
					.findByRoomTypeIdAndStayDate(roomType.getId(), day)
					.orElseGet(() -> {
						Availability created = new Availability();
						created.setRoomTypeId(roomType.getId());
						created.setStayDate(day);
						created.setRoomsSold(0);
						created.setOutOfOrder(0);
						created.setBlocked(0);
						return created;
					});
			if (in.outOfOrder() != null) {
				row.setOutOfOrder(nonNegative(in.outOfOrder(), "outOfOrder"));
			}
			if (in.blocked() != null) {
				row.setBlocked(nonNegative(in.blocked(), "blocked"));
			}
			if (row.getRoomsSold() + row.getOutOfOrder() + row.getBlocked()
					> rt.getTotalInventory()) {
				throw DomainException.conflict(
						"capacity exceeded: sold + out of order + blocked cannot exceed inventory");
			}
			if (row.isEmpty()) {
				if (row.getId() != null) {
					availabilityRepository.delete(row);
				}
			} else {
				updated.add(availabilityRepository.save(row));
			}
			cursor = cursor.plusDays(1);
		}
		audit.record(actor, "availability.range.updated", "hotel", hotelId, hotelId, Map.of(
				"room_type_id", roomType.getId(), "from_date", in.fromDate().toString(),
				"to_date", in.toDate().toString()));
		return updated;
	}

	private CurrentUser requireStaffAccess(UUID hotelId) {
		CurrentUser actor = currentUser.require();
		if (!actor.hasRole("super_admin") && !actor.inHotel(hotelId)) {
			throw DomainException.forbidden("no access to this hotel");
		}
		return actor;
	}

	private int nonNegative(int value, String field) {
		if (value < 0) {
			throw DomainException.validation(field + " cannot be negative");
		}
		return value;
	}
}
package com.hotelcollection.hotel.service.impl;

import java.time.Instant;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.service.AuditService;
import com.hotelcollection.hotel.service.AvailabilityService;
import com.hotelcollection.hotel.dto.catalog.AdminBulkRoomInput;
import com.hotelcollection.hotel.dto.catalog.AdminHotelInput;
import com.hotelcollection.hotel.dto.catalog.AdminRoomInput;
import com.hotelcollection.hotel.dto.catalog.AdminRoomTypeInput;
import com.hotelcollection.hotel.service.CatalogAdminService;
import com.hotelcollection.hotel.dto.catalog.HotelPolicyInput;
import com.hotelcollection.hotel.entity.Amenity;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.HotelPolicy;
import com.hotelcollection.hotel.entity.Room;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.repository.AmenityRepository;
import com.hotelcollection.hotel.repository.HotelRepository;
import com.hotelcollection.hotel.repository.RoomRepository;
import com.hotelcollection.hotel.repository.RoomTypeRepository;
import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.service.HotelPolicyAdminService;
import com.hotelcollection.hotel.service.MediaAdminService;
import com.hotelcollection.hotel.dto.media.MediaInput;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.service.ReferenceQueryService;
import com.hotelcollection.hotel.exception.DomainException;

/**
 * Back-office catalog write use cases (hotels, room types, rooms,
 * amenities). Authorization (hotel scoping / super_admin) is enforced
 * internally; media sets are delegated to the media services.
 */
@Service
public class CatalogAdminServiceImpl implements CatalogAdminService {

	private final HotelRepository hotelRepository;
	private final RoomTypeRepository roomTypeRepository;
	private final RoomRepository roomRepository;
	private final AmenityRepository amenityRepository;
	private final HotelPolicyAdminService hotelPolicyAdmin;
	private final MediaAdminService mediaAdmin;
	private final ReferenceQueryService reference;
	private final AuditService audit;
	private final CurrentUserAccessor currentUser;

	public CatalogAdminServiceImpl(HotelRepository hotelRepository,
			RoomTypeRepository roomTypeRepository, RoomRepository roomRepository,
			AmenityRepository amenityRepository, HotelPolicyAdminService hotelPolicyAdmin,
			MediaAdminService mediaAdmin, ReferenceQueryService reference, AuditService audit,
			CurrentUserAccessor currentUser) {
		this.hotelRepository = hotelRepository;
		this.roomTypeRepository = roomTypeRepository;
		this.roomRepository = roomRepository;
		this.amenityRepository = amenityRepository;
		this.hotelPolicyAdmin = hotelPolicyAdmin;
		this.mediaAdmin = mediaAdmin;
		this.reference = reference;
		this.audit = audit;
		this.currentUser = currentUser;
	}

	// ---------------------------------------------------------------- hotel

	@Override
	@Transactional
	public Hotel createHotel(AdminHotelInput in) {
		CurrentUser actor = requireSuperAdmin();
		Hotel hotel = new Hotel();
		hotel.setName(required(in.name(), "name"));
		hotel.setBrand(in.brand());
		hotel.setDescription(in.description());
		hotel.setLongDescription(in.longDescription());
		hotel.setHotelType(in.hotelType());
		hotel.setAddressLine1(in.addressLine1());
		hotel.setAddressLine2(in.addressLine2());
		hotel.setCity(in.city());
		hotel.setCountryCode(in.countryCode());
		hotel.setLatitude(in.latitude());
		hotel.setLongitude(in.longitude());
		hotel.setPhone(in.phone());
		hotel.setEmail(in.email());
		hotel.setWebsite(in.website());
		hotel.setTimezone(in.timezone());
		hotel.setLanguages(in.languages());
		hotel.setStarRating(in.starRating() == null ? null : in.starRating().shortValue());
		hotel.setCheckInTime(parseTime(in.checkInTime()));
		hotel.setCheckOutTime(parseTime(in.checkOutTime()));
		hotel.setDefaultCurrency(validateCurrency(in.defaultCurrency(), "defaultCurrency"));
		hotel.setStatus(in.status() == null ? "active" : validStatus(in.status(), "hotel"));
		hotel.setSlug(uniqueHotelSlug(hotel.getName()));
		hotel.setCreatedAt(Instant.now());
		hotel.setUpdatedAt(Instant.now());
		try {
			hotelRepository.saveAndFlush(hotel);
		} catch (DataIntegrityViolationException ex) {
			throw DomainException.validation("invalid reference data (country or currency)");
		}
		audit.record(actor, "hotel.created", "hotel", hotel.getId(), hotel.getId(),
				Map.of("name", hotel.getName()));
		return hotel;
	}

	@Override
	@Transactional
	public Hotel updateHotel(UUID id, AdminHotelInput in) {
		CurrentUser actor = requireStaffAccess(id);
		Hotel hotel = hotelRepository.findById(id)
				.orElseThrow(() -> DomainException.notFound("hotel not found"));
		if (in.name() != null) {
			hotel.setName(required(in.name(), "name"));
		}
		applyIfPresent(in.brand(), hotel::setBrand);
		applyIfPresent(in.description(), hotel::setDescription);
		applyIfPresent(in.longDescription(), hotel::setLongDescription);
		applyIfPresent(in.hotelType(), hotel::setHotelType);
		applyIfPresent(in.addressLine1(), hotel::setAddressLine1);
		applyIfPresent(in.addressLine2(), hotel::setAddressLine2);
		applyIfPresent(in.city(), hotel::setCity);
		applyIfPresent(in.countryCode(), hotel::setCountryCode);
		applyIfPresent(in.latitude(), hotel::setLatitude);
		applyIfPresent(in.longitude(), hotel::setLongitude);
		applyIfPresent(in.phone(), hotel::setPhone);
		applyIfPresent(in.email(), hotel::setEmail);
		applyIfPresent(in.website(), hotel::setWebsite);
		applyIfPresent(in.timezone(), hotel::setTimezone);
		if (in.languages() != null) {
			hotel.setLanguages(in.languages());
		}
		if (in.starRating() != null) {
			hotel.setStarRating(in.starRating().shortValue());
		}
		if (in.checkInTime() != null) {
			hotel.setCheckInTime(parseTime(in.checkInTime()));
		}
		if (in.checkOutTime() != null) {
			hotel.setCheckOutTime(parseTime(in.checkOutTime()));
		}
		if (in.defaultCurrency() != null) {
			hotel.setDefaultCurrency(validateCurrency(in.defaultCurrency(), "defaultCurrency"));
		}
		if (in.status() != null) {
			hotel.setStatus(validStatus(in.status(), "hotel"));
		}
		hotel.setUpdatedAt(Instant.now());
		try {
			hotelRepository.saveAndFlush(hotel);
		} catch (DataIntegrityViolationException ex) {
			throw DomainException.validation("invalid reference data (country or currency)");
		}
		audit.record(actor, "hotel.updated", "hotel", hotel.getId(), hotel.getId(),
				Map.of("name", hotel.getName()));
		return hotel;
	}

	@Override
	@Transactional
	public List<Amenity> setHotelAmenities(UUID hotelId, List<UUID> amenityIds) {
		CurrentUser actor = requireStaffAccess(hotelId);
		Hotel hotel = hotelRepository.findById(hotelId)
				.orElseThrow(() -> DomainException.notFound("hotel not found"));
		List<Amenity> amenities = amenityRepository.findAllById(amenityIds == null
				? List.of() : amenityIds);
		if (amenities.size() != (amenityIds == null ? 0 : amenityIds.size())) {
			throw DomainException.validation("unknown amenity id");
		}
		hotel.getAmenities().clear();
		hotel.getAmenities().addAll(amenities);
		hotel.setUpdatedAt(Instant.now());
		hotelRepository.save(hotel);
		audit.record(actor, "hotel.amenities.updated", "hotel", hotelId, hotelId,
				Map.of("count", amenities.size()));
		return List.copyOf(hotel.getAmenities());
	}

	@Override
	@Transactional
	public List<Media> setHotelMedia(UUID hotelId, List<MediaInput> inputs) {
		CurrentUser actor = requireStaffAccess(hotelId);
		List<Media> media = mediaAdmin.replaceHotelMedia(hotelId, inputs);
		audit.record(actor, "hotel.media.updated", "hotel", hotelId, hotelId,
				Map.of("count", media.size()));
		return media;
	}

	@Override
	@Transactional
	public List<HotelPolicy> setHotelPolicies(UUID hotelId, List<HotelPolicyInput> inputs) {
		CurrentUser actor = requireStaffAccess(hotelId);
		requireHotel(hotelId);
		List<HotelPolicy> policies = hotelPolicyAdmin.replaceHotelPolicies(hotelId, inputs);
		audit.record(actor, "hotel.policies.updated", "hotel", hotelId, hotelId,
				Map.of("count", policies.size()));
		return policies;
	}

	// ---------------------------------------------------------------- room types

	@Override
	@Transactional
	public RoomType createRoomType(UUID hotelId, AdminRoomTypeInput in) {
		CurrentUser actor = requireStaffAccess(hotelId);
		requireHotel(hotelId);
		RoomType rt = new RoomType();
		rt.setHotelId(hotelId);
		rt.setName(required(in.name(), "name"));
		rt.setDescription(in.description());
		rt.setLongDescription(in.longDescription());
		rt.setMaxAdults(in.maxAdults() == null ? (short) 2 : in.maxAdults().shortValue());
		rt.setMaxChildren(in.maxChildren() == null ? (short) 0 : in.maxChildren().shortValue());
		rt.setBedConfiguration(in.bedConfiguration());
		rt.setSizeSqm(in.sizeSqm());
		rt.setViewType(in.viewType());
		rt.setStatus(in.status() == null ? "active" : validStatus(in.status(), "room type"));
		rt.setTotalInventory(in.totalInventory() == null ? 10
				: nonNegative(in.totalInventory(), "totalInventory"));
		rt.setCreatedAt(Instant.now());
		rt.setUpdatedAt(Instant.now());
		rt.setSlug(uniqueRoomTypeSlug(hotelId, in.name()));
		if (rt.getMaxAdults() < 0 || rt.getMaxChildren() < 0) {
			throw DomainException.validation("occupancy cannot be negative");
		}
		roomTypeRepository.save(rt);
		// Inventory is derived from physical rooms (V26 trigger): a new room
		// type has zero rooms until rooms are added, whatever totalInventory
		// the caller sent.
		rt.setTotalInventory((int) roomRepository.countActiveByRoomTypeId(rt.getId()));
		audit.record(actor, "room_type.created", "room_type", rt.getId(), hotelId,
				Map.of("name", rt.getName()));
		return rt;
	}

	@Override
	@Transactional
	public RoomType updateRoomType(UUID id, AdminRoomTypeInput in) {
		RoomType rt = roomTypeRepository.findById(id)
				.orElseThrow(() -> DomainException.notFound("room type not found"));
		CurrentUser actor = requireStaffAccess(rt.getHotelId());
		if (in.name() != null) {
			rt.setName(required(in.name(), "name"));
			rt.setSlug(uniqueRoomTypeSlug(rt.getHotelId(), in.name()));
		}
		applyIfPresent(in.description(), rt::setDescription);
		applyIfPresent(in.longDescription(), rt::setLongDescription);
		if (in.maxAdults() != null) {
			rt.setMaxAdults(in.maxAdults().shortValue());
		}
		if (in.maxChildren() != null) {
			rt.setMaxChildren(in.maxChildren().shortValue());
		}
		applyIfPresent(in.bedConfiguration(), rt::setBedConfiguration);
		applyIfPresent(in.sizeSqm(), rt::setSizeSqm);
		applyIfPresent(in.viewType(), rt::setViewType);
		if (in.totalInventory() != null) {
			requireDerivedInventory(rt.getId(), nonNegative(in.totalInventory(), "totalInventory"));
		}
		if (in.status() != null) {
			rt.setStatus(validStatus(in.status(), "room type"));
		}
		if (rt.getMaxAdults() < 0 || rt.getMaxChildren() < 0) {
			throw DomainException.validation("occupancy cannot be negative");
		}
		rt.setUpdatedAt(Instant.now());
		roomTypeRepository.save(rt);
		audit.record(actor, "room_type.updated", "room_type", rt.getId(), rt.getHotelId(),
				Map.of("name", rt.getName()));
		return rt;
	}

	@Override
	@Transactional
	public List<Amenity> setRoomTypeAmenities(UUID roomTypeId, List<UUID> amenityIds) {
		RoomType rt = roomTypeRepository.findById(roomTypeId)
				.orElseThrow(() -> DomainException.notFound("room type not found"));
		CurrentUser actor = requireStaffAccess(rt.getHotelId());
		List<Amenity> amenities = amenityRepository.findAllById(amenityIds == null
				? List.of() : amenityIds);
		if (amenities.size() != (amenityIds == null ? 0 : amenityIds.size())) {
			throw DomainException.validation("unknown amenity id");
		}
		rt.getAmenities().clear();
		rt.getAmenities().addAll(amenities);
		rt.setUpdatedAt(Instant.now());
		roomTypeRepository.save(rt);
		audit.record(actor, "room_type.amenities.updated", "room_type", roomTypeId,
				rt.getHotelId(), Map.of("count", amenities.size()));
		return List.copyOf(rt.getAmenities());
	}

	@Override
	@Transactional
	public List<Media> setRoomTypeMedia(UUID roomTypeId, List<MediaInput> inputs) {
		RoomType rt = roomTypeRepository.findById(roomTypeId)
				.orElseThrow(() -> DomainException.notFound("room type not found"));
		CurrentUser actor = requireStaffAccess(rt.getHotelId());
		List<Media> media = mediaAdmin.replaceRoomTypeMedia(roomTypeId, inputs);
		audit.record(actor, "room_type.media.updated", "room_type", roomTypeId, rt.getHotelId(),
				Map.of("count", media.size()));
		return media;
	}

	// ---------------------------------------------------------------- rooms

	@Override
	@Transactional
	public Room createRoom(UUID hotelId, AdminRoomInput in) {
		CurrentUser actor = requireStaffAccess(hotelId);
		requireHotel(hotelId);
		UUID roomTypeId = in.roomTypeId();
		RoomType rt = roomTypeId == null ? null
				: roomTypeRepository.findById(roomTypeId).orElse(null);
		if (rt == null) {
			throw DomainException.validation("room type not found");
		}
		if (!rt.getHotelId().equals(hotelId)) {
			throw DomainException.validation("room type does not belong to this hotel");
		}
		if (roomRepository.existsByHotelIdAndRoomNumber(hotelId, in.roomNumber())) {
			throw DomainException.conflict("room number already exists in this hotel");
		}
		Room room = new Room();
		room.setHotelId(hotelId);
		room.setRoomTypeId(in.roomTypeId());
		room.setRoomNumber(required(in.roomNumber(), "roomNumber"));
		room.setFloor(in.floor());
		room.setStatus(in.status() == null ? "active" : validRoomStatus(in.status()));
		room.setHousekeepingStatus(in.housekeepingStatus() == null ? "clean"
				: validHousekeepingStatus(in.housekeepingStatus()));
		room.setMaintenanceStatus(in.maintenanceStatus() == null ? "ok"
				: validMaintenanceStatus(in.maintenanceStatus()));
		room.setCreatedAt(Instant.now());
		room.setUpdatedAt(Instant.now());
		roomRepository.save(room);
		audit.record(actor, "room.created", "room", room.getId(), hotelId,
				Map.of("roomNumber", room.getRoomNumber()));
		return room;
	}

	@Override
	@Transactional
	public Room updateRoom(UUID id, AdminRoomInput in) {
		Room room = roomRepository.findById(id)
				.orElseThrow(() -> DomainException.notFound("room not found"));
		CurrentUser actor = requireStaffAccess(room.getHotelId());
		if (in.roomTypeId() != null) {
			RoomType rt = roomTypeRepository.findById(in.roomTypeId())
					.orElseThrow(() -> DomainException.validation("room type not found"));
			if (!rt.getHotelId().equals(room.getHotelId())) {
				throw DomainException.validation("room type does not belong to this hotel");
			}
			room.setRoomTypeId(in.roomTypeId());
		}
		if (in.roomNumber() != null) {
			if (!in.roomNumber().equals(room.getRoomNumber())
					&& roomRepository.existsByHotelIdAndRoomNumber(room.getHotelId(),
							in.roomNumber())) {
				throw DomainException.conflict("room number already exists in this hotel");
			}
			room.setRoomNumber(required(in.roomNumber(), "roomNumber"));
		}
		applyIfPresent(in.floor(), room::setFloor);
		if (in.status() != null) {
			room.setStatus(validRoomStatus(in.status()));
		}
		if (in.housekeepingStatus() != null) {
			room.setHousekeepingStatus(validHousekeepingStatus(in.housekeepingStatus()));
		}
		if (in.maintenanceStatus() != null) {
			room.setMaintenanceStatus(validMaintenanceStatus(in.maintenanceStatus()));
		}
		room.setUpdatedAt(Instant.now());
		roomRepository.save(room);
		audit.record(actor, "room.updated", "room", room.getId(), room.getHotelId(),
				Map.of("roomNumber", room.getRoomNumber()));
		return room;
	}

	private static final int MAX_BULK_ROOMS = 200;

	@Override
	@Transactional
	public List<Room> bulkCreateRooms(UUID hotelId, UUID roomTypeId, AdminBulkRoomInput in) {
		CurrentUser actor = requireStaffAccess(hotelId);
		requireHotel(hotelId);
		RoomType rt = roomTypeRepository.findById(roomTypeId)
				.orElseThrow(() -> DomainException.validation("room type not found"));
		if (!rt.getHotelId().equals(hotelId)) {
			throw DomainException.validation("room type does not belong to this hotel");
		}

		List<String> roomNumbers = buildRoomNumbers(in);
		if (roomNumbers.isEmpty()) {
			throw DomainException.validation("no room numbers to create");
		}
		if (roomNumbers.size() > MAX_BULK_ROOMS) {
			throw DomainException.validation("cannot create more than " + MAX_BULK_ROOMS + " rooms at once");
		}
		java.util.Set<String> deduped = new java.util.LinkedHashSet<>(roomNumbers);
		if (deduped.size() != roomNumbers.size()) {
			throw DomainException.validation("room numbers must be unique within the batch");
		}

		List<String> existing = roomRepository.findExistingRoomNumbers(hotelId, roomNumbers);
		if (!existing.isEmpty()) {
			throw DomainException.conflict(
					"these room numbers already exist in this hotel: " + String.join(", ", existing));
		}

		String status = in.status() == null ? "active" : validRoomStatus(in.status());
		Instant now = Instant.now();
		List<Room> rooms = new java.util.ArrayList<>();
		for (String roomNumber : roomNumbers) {
			Room room = new Room();
			room.setHotelId(hotelId);
			room.setRoomTypeId(roomTypeId);
			room.setRoomNumber(roomNumber);
			room.setFloor(in.floor());
			room.setStatus(status);
			room.setHousekeepingStatus("clean");
			room.setMaintenanceStatus("ok");
			room.setCreatedAt(now);
			room.setUpdatedAt(now);
			rooms.add(room);
		}
		try {
			roomRepository.saveAll(rooms);
			roomRepository.flush();
		} catch (DataIntegrityViolationException ex) {
			throw DomainException.conflict("one or more room numbers already exist in this hotel");
		}
		audit.record(actor, "room.bulk_created", "room_type", roomTypeId, hotelId,
				Map.of("count", rooms.size(), "roomNumbers", roomNumbers));
		return rooms;
	}

	/** Manual {@code roomNumbers} list takes precedence; otherwise generates
	 * {@code count} numbers from {@code startNumber}, formatted
	 * "{prefix}-{n}" when a prefix is given, else the plain number. */
	private List<String> buildRoomNumbers(AdminBulkRoomInput in) {
		if (in.roomNumbers() != null && !in.roomNumbers().isEmpty()) {
			return in.roomNumbers().stream()
					.map(n -> n == null ? "" : n.trim())
					.peek(n -> {
						if (n.isEmpty()) {
							throw DomainException.validation("room numbers cannot be blank");
						}
					})
					.toList();
		}
		if (in.count() == null || in.count() <= 0) {
			throw DomainException.validation("either roomNumbers or a positive count is required");
		}
		if (in.startNumber() == null) {
			throw DomainException.validation("startNumber is required when generating by count");
		}
		String prefix = in.prefix() == null ? "" : in.prefix().trim();
		List<String> generated = new java.util.ArrayList<>();
		for (int i = 0; i < in.count(); i++) {
			int n = in.startNumber() + i;
			generated.add(prefix.isEmpty() ? String.valueOf(n) : prefix + "-" + n);
		}
		return generated;
	}

	@Override
	@Transactional(readOnly = true)
	public List<Amenity> amenityCatalog(boolean includeInactive) {
		currentUser.requireStaff();
		return includeInactive
				? amenityRepository.findAllByOrderByCategoryAscNameAsc()
				: amenityRepository.findByIsActiveTrueOrderByCategoryAscNameAsc();
	}

	@Override
	@Transactional
	public RoomType setRoomTypeInventory(UUID roomTypeId, int totalInventory) {
		RoomType rt = roomTypeRepository.findById(roomTypeId)
				.orElseThrow(() -> DomainException.validation("room type not found"));
		requireStaffAccess(rt.getHotelId());
		requireDerivedInventory(roomTypeId, nonNegative(totalInventory, "totalInventory"));
		return rt;
	}

	// ---------------------------------------------------------------- helpers

	/**
	 * Inventory is derived from physical rooms (V26): room_types.total_inventory
	 * always equals the count of ACTIVE rooms of the type. A direct write that
	 * disagrees with the derived value is rejected — staff must add or
	 * deactivate physical rooms instead.
	 */
	private void requireDerivedInventory(UUID roomTypeId, int requested) {
		long derived = roomRepository.countActiveByRoomTypeId(roomTypeId);
		if (requested != derived) {
			throw DomainException.validation("totalInventory is managed through physical rooms — "
					+ "add or deactivate rooms instead (current inventory: " + derived + ")");
		}
	}

	/** Unique slug from a name (collision strategy: append -2, -3, …). */
	private String uniqueHotelSlug(String name) {
		String base = name == null ? "hotel"
				: name.trim().toLowerCase().replaceAll("[^a-z0-9]+", "-")
						.replaceAll("(^-|-$)", "");
		if (base.isBlank()) {
			base = "hotel";
		}
		if (!hotelRepository.existsBySlug(base)) {
			return base;
		}
		for (int suffix = 2; ; suffix++) {
			String candidate = base + "-" + suffix;
			if (!hotelRepository.existsBySlug(candidate)) {
				return candidate;
			}
		}
	}

	private String uniqueRoomTypeSlug(UUID hotelId, String name) {
		String base = name == null ? "room"
				: name.trim().toLowerCase().replaceAll("[^a-z0-9]+", "-")
						.replaceAll("(^-|-$)", "");
		if (base.isBlank()) {
			base = "room";
		}
		if (!roomTypeRepository.existsByHotelIdAndSlug(hotelId, base)) {
			return base;
		}
		for (int suffix = 2; ; suffix++) {
			String candidate = base + "-" + suffix;
			if (!roomTypeRepository.existsByHotelIdAndSlug(hotelId, candidate)) {
				return candidate;
			}
		}
	}

	private Hotel requireHotel(UUID hotelId) {
		return hotelRepository.findById(hotelId)
				.orElseThrow(() -> DomainException.notFound("hotel not found"));
	}

	private CurrentUser requireStaffAccess(UUID hotelId) {
		return currentUser.requireHotelAccess(hotelId);
	}

	private CurrentUser requireSuperAdmin() {
		return currentUser.requireSuperAdmin();
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

	private String validateCurrency(String code, String field) {
		String trimmed = required(code, field).trim().toUpperCase();
		if (!reference.currencyExists(trimmed)) {
			throw DomainException.validation("unknown currency: " + trimmed);
		}
		return trimmed;
	}

	private LocalTime parseTime(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}
		try {
			return LocalTime.parse(value.trim());
		} catch (DateTimeParseException ex) {
			throw DomainException.validation("time must be in HH:mm format");
		}
	}

	private String validStatus(String status, String what) {
		if (!List.of("active", "inactive", "draft").contains(status)) {
			throw DomainException.validation("invalid " + what + " status");
		}
		return status;
	}

	private String validRoomStatus(String status) {
		if (!List.of("active", "inactive", "out_of_order").contains(status)) {
			throw DomainException.validation("invalid room status");
		}
		return status;
	}

	private String validHousekeepingStatus(String status) {
		if (!List.of("clean", "dirty", "inspected", "out_of_service").contains(status)) {
			throw DomainException.validation("invalid housekeeping status");
		}
		return status;
	}

	private String validMaintenanceStatus(String status) {
		if (!List.of("ok", "needs_repair", "under_repair").contains(status)) {
			throw DomainException.validation("invalid maintenance status");
		}
		return status;
	}

	private int nonNegative(int value, String field) {
		if (value < 0) {
			throw DomainException.validation(field + " cannot be negative");
		}
		return value;
	}
}
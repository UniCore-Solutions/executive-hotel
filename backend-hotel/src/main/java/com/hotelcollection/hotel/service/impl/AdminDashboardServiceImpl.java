package com.hotelcollection.hotel.service.impl;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.dto.admin.AdminDashboardView;
import com.hotelcollection.hotel.service.AdminDashboardService;
import com.hotelcollection.hotel.service.AvailabilityService;
import com.hotelcollection.hotel.entity.Availability;
import com.hotelcollection.hotel.service.BillingAdminService;
import com.hotelcollection.hotel.dto.catalog.AdminHotel;
import com.hotelcollection.hotel.dto.catalog.AdminHotelPage;
import com.hotelcollection.hotel.dto.catalog.AdminHotelSummary;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.service.MediaQueryService;
import com.hotelcollection.hotel.service.RateQueryService;
import com.hotelcollection.hotel.service.ReservationAdminService;
import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.dto.PageInput;

/**
 * Admin facade use cases (composes services across layers only): hotel
 * list, hotel workspace and the operational dashboard. Authorization (hotel
 * scoping / super_admin) is enforced internally.
 */
@Service
public class AdminDashboardServiceImpl implements AdminDashboardService {

	private final CatalogQueryService catalog;
	private final RateQueryService rate;
	private final AvailabilityService availability;
	private final MediaQueryService media;
	private final ReservationAdminService reservations;
	private final BillingAdminService billing;
	private final CurrentUserAccessor currentUser;

	public AdminDashboardServiceImpl(CatalogQueryService catalog, RateQueryService rate,
			AvailabilityService availability, MediaQueryService media,
			ReservationAdminService reservations, BillingAdminService billing,
			CurrentUserAccessor currentUser) {
		this.catalog = catalog;
		this.rate = rate;
		this.availability = availability;
		this.media = media;
		this.reservations = reservations;
		this.billing = billing;
		this.currentUser = currentUser;
	}

	@Transactional(readOnly = true)
	public AdminHotelPage hotels(PageInput page) {
		CurrentUser user = currentUser.require();
		Page<Hotel> result = user.hasRole("super_admin")
				? catalog.hotelsPaged(true, List.of(), page)
				: catalog.hotelsPaged(false,
						user.hotelIds() == null ? List.of() : user.hotelIds(), page);
		List<UUID> ids = result.getContent().stream().map(Hotel::getId).toList();
		Map<UUID, Long> roomTypeCounts = catalog.countRoomTypesByHotelIds(ids);
		Map<UUID, Long> activeReservations = reservations.countActiveByHotelIds(ids);
		List<AdminHotelSummary> items = result.getContent().stream()
				.map(h -> new AdminHotelSummary(h.getId(), h.getName(), h.getBrand(), h.getCity(),
						h.getCountryCode(), h.getStatus(), h.getStarRating() == null ? null
								: h.getStarRating().intValue(),
						roomTypeCounts.getOrDefault(h.getId(), 0L),
						activeReservations.getOrDefault(h.getId(), 0L)))
				.toList();
		return new AdminHotelPage(result.getTotalElements(), result.getNumber(), result.getSize(),
				items);
	}

	@Transactional(readOnly = true)
	public AdminHotel hotelWorkspace(UUID hotelId) {
		requireStaffAccess(hotelId);
		Hotel hotel = catalog.getHotel(hotelId);
		return new AdminHotel(hotel.getId(), hotel.getName(), hotel.getStatus(), hotel,
				catalog.roomTypeWorkspace(hotelId), rate.ratePlanWorkspace(hotelId),
				availability.range(hotelId, LocalDate.now(), LocalDate.now().plusDays(30)),
				hotel.getAmenities(), media.findByHotelId(hotelId),
				catalog.experiences(hotelId), catalog.restaurants(hotelId), catalog.faqs(hotelId),
				catalog.extras(hotelId));
	}

	@Transactional(readOnly = true)
	public AdminDashboardView dashboard(UUID hotelId) {
		requireStaffAccess(hotelId);
		Hotel hotel = catalog.getHotel(hotelId);
		LocalDate today = LocalDate.now();
		long arrivals = reservations.countArrivals(hotelId, today);
		long departures = reservations.countDepartures(hotelId, today);
		long inHouse = reservations.countInHouse(hotelId);
		long pendingPayments = reservations.countPendingPayments(hotelId);

		long reservationsTotal = reservations.countActiveReservations(hotelId);
		long invoices = billing.countInvoices(hotelId);
		long pendingInvoices = Math.max(0, reservationsTotal - invoices);

		java.math.BigDecimal revenue = billing.sumCaptured(hotelId);

		List<Availability> tonight = availability.range(hotelId, today, today);
		Map<UUID, Availability> byRoomType = tonight.stream()
				.collect(java.util.stream.Collectors.toMap(Availability::getRoomTypeId, a -> a));
		List<RoomType> roomTypes = catalog.roomTypes(hotelId);
		long soldOut = 0;
		long available = 0;
		int sold = 0;
		int total = 0;
		for (RoomType rt : roomTypes) {
			Availability a = byRoomType.get(rt.getId());
			int free = a == null ? rt.getTotalInventory() : a.free(rt.getTotalInventory());
			total += rt.getTotalInventory();
			sold += a == null ? 0 : a.getRoomsSold();
			available += Math.max(0, free);
			if (free <= 0) {
				soldOut++;
			}
		}
		double occupancy = total == 0 ? 0.0 : (sold * 100.0) / total;

		List<Reservation> recent = reservations.recentReservations(hotelId, 5);
		return new AdminDashboardView(hotelId, hotel.getName(), arrivals, departures, inHouse,
				soldOut, occupancy, available, revenue, pendingPayments, pendingInvoices, recent);
	}

	private void requireStaffAccess(UUID hotelId) {
		currentUser.requireHotelAccess(hotelId);
	}
}
package com.hotelcollection.hotel.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.dto.reservation.AdminGuestPage;
import com.hotelcollection.hotel.dto.reservation.AdminGuestView;
import com.hotelcollection.hotel.service.ReservationAdminService;
import com.hotelcollection.hotel.entity.Guest;
import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.entity.ReservationStatus;
import com.hotelcollection.hotel.repository.GuestRepository;
import com.hotelcollection.hotel.repository.ReservationRepository;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.dto.PageInput;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.PaymentStatus;

/**
 * Back-office reservation reads (guest book, dashboard counters).
 * Hotel-staff scoping is enforced internally.
 */
@Service
public class ReservationAdminServiceImpl implements ReservationAdminService {

	private final GuestRepository guestRepository;
	private final ReservationRepository reservationRepository;
	private final CurrentUserAccessor currentUser;

	public ReservationAdminServiceImpl(GuestRepository guestRepository,
			ReservationRepository reservationRepository, CurrentUserAccessor currentUser) {
		this.guestRepository = guestRepository;
		this.reservationRepository = reservationRepository;
		this.currentUser = currentUser;
	}

	@Override
	@Transactional(readOnly = true)
	public AdminGuestPage guests(UUID hotelId, String query, PageInput page) {
		CurrentUser actor = currentUser.require();
		if (!actor.hasRole("super_admin") && !actor.inHotel(hotelId)) {
			throw DomainException.forbidden("no access to this hotel");
		}
		int p = page == null || page.page() == null ? 0 : Math.max(page.page(), 0);
		int s = page == null || page.size() == null ? 20 : Math.min(Math.max(page.size(), 1), 100);
		String trimmed = query == null || query.isBlank() ? null : query.trim();
		Page<Guest> result = guestRepository
				.findDistinctByHotel(hotelId, trimmed, PageRequest.of(p, s));
		List<UUID> guestIds = result.getContent().stream().map(Guest::getId).toList();
		Map<UUID, List<Reservation>> staysByGuest = guestIds.isEmpty() ? Map.of()
				: reservationRepository.findByGuestIdsAndHotelId(guestIds, hotelId).stream()
						.collect(Collectors.groupingBy(Reservation::getGuestId));
		List<AdminGuestView> items = result.getContent().stream()
				.map(g -> {
					List<Reservation> stays = staysByGuest.getOrDefault(g.getId(), List.of());
					long count = stays.stream()
							.filter(r -> r.getStatus() != ReservationStatus.cancelled).count();
					BigDecimal spent = stays.stream()
							.filter(r -> r.getStatus() != ReservationStatus.cancelled)
							.map(Reservation::getTotalAmount)
							.reduce(BigDecimal.ZERO, BigDecimal::add);
					LocalDate lastStay = stays.stream()
							.map(Reservation::getCheckOutDate).max(LocalDate::compareTo).orElse(null);
					return new AdminGuestView(g.getId(), g.getFirstName(), g.getLastName(),
							g.getEmail(), g.getPhone(), g.getCountryCode(), count, spent, lastStay);
				})
				.toList();
		return new AdminGuestPage(result.getTotalElements(), result.getNumber(), result.getSize(),
				items);
	}

	@Override
	@Transactional(readOnly = true)
	public long countArrivals(UUID hotelId, LocalDate date) {
		return reservationRepository.countByHotelIdAndCheckInDate(hotelId, date);
	}

	@Override
	@Transactional(readOnly = true)
	public long countDepartures(UUID hotelId, LocalDate date) {
		return reservationRepository.countByHotelIdAndCheckOutDateAndStatusNot(hotelId, date,
				ReservationStatus.cancelled);
	}

	@Override
	@Transactional(readOnly = true)
	public long countInHouse(UUID hotelId) {
		return reservationRepository.countByHotelIdAndStatus(hotelId,
				ReservationStatus.checked_in);
	}

	@Override
	@Transactional(readOnly = true)
	public long countPendingPayments(UUID hotelId) {
		return reservationRepository.countByHotelIdAndPaymentStatus(hotelId,
				PaymentStatus.pending);
	}

	@Override
	@Transactional(readOnly = true)
	public long countActiveReservations(UUID hotelId) {
		return reservationRepository.countByHotelIdAndStatusNot(hotelId,
				ReservationStatus.cancelled);
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, Long> countActiveByHotelIds(Collection<UUID> ids) {
		List<Object[]> rows = reservationRepository.countActiveByHotelIds(ids);
		Map<UUID, Long> map = new java.util.HashMap<>();
		for (Object[] row : rows) {
			map.put(UUID.fromString(row[0].toString()), ((Number) row[1]).longValue());
		}
		return map;
	}

	@Override
	@Transactional(readOnly = true)
	public List<Reservation> recentReservations(UUID hotelId, int limit) {
		return reservationRepository
				.findByHotelIdOrderByCreatedAtDesc(hotelId, PageRequest.of(0, limit))
				.getContent();
	}
}
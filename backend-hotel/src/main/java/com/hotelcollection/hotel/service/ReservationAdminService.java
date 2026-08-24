package com.hotelcollection.hotel.service;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.dto.PageInput;
import com.hotelcollection.hotel.dto.reservation.AdminGuestPage;

/**
 * Back-office reservation reads (guest book, dashboard counters).
 * Authorization (hotel staff) is enforced internally.
 */
public interface ReservationAdminService {

	AdminGuestPage guests(UUID hotelId, String query, PageInput page);

	long countArrivals(UUID hotelId, java.time.LocalDate date);

	long countDepartures(UUID hotelId, java.time.LocalDate date);

	long countInHouse(UUID hotelId);

	long countPendingPayments(UUID hotelId);

	long countActiveReservations(UUID hotelId);

	java.util.Map<UUID, Long> countActiveByHotelIds(java.util.Collection<UUID> ids);

	List<Reservation> recentReservations(UUID hotelId, int limit);
}
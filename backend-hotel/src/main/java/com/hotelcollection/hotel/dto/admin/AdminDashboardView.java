package com.hotelcollection.hotel.dto.admin;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Reservation;

/** Operational dashboard for one hotel (back-office). */
public record AdminDashboardView(UUID hotelId, String hotelName, long arrivalsToday,
		long departuresToday, long inHouseToday, long soldOutTonight, double occupancyPct,
		long availableTonight, BigDecimal revenueTotal, long pendingPayments,
		long pendingInvoices, List<Reservation> recentReservations) {
}

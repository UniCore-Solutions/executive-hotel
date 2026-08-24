package com.hotelcollection.hotel.service;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.entity.ReservationStatus;
import com.hotelcollection.hotel.dto.PageInput;
import com.hotelcollection.hotel.dto.reservation.CancelReservationInput;
import com.hotelcollection.hotel.dto.reservation.CreateReservationInput;
import com.hotelcollection.hotel.dto.reservation.CreateResult;
import com.hotelcollection.hotel.dto.reservation.ReservationPageResult;

/**
 * Reservation use cases: create (idempotent by idempotency_key, server-side
 * pricing snapshot, availability locked and sold in the same transaction),
 * lookup, cancel (penalty rule + inventory release + outbox event), and the
 * read operations other services depend on. Authorization (owner / hotel
 * staff) is enforced internally.
 */
public interface BookingService {

	CreateResult create(CreateReservationInput in);

	Reservation cancel(CancelReservationInput in);

	Reservation adminCancel(UUID reservationId, String reasonCode, String reasonNote);

	Reservation getByReferenceAndEmail(String reference, String email);

	Reservation getById(UUID id);

	/**
	 * Locked read (PESSIMISTIC_WRITE): serializes concurrent money operations
	 * (payments) against the same reservation. Used by the billing service.
	 */
	Reservation getByIdForUpdate(UUID id);

	List<Reservation> myReservations();

	ReservationPageResult adminReservations(UUID hotelId, ReservationStatus status, PageInput page);

	String cancellationReasonLabel(UUID id);

	/** Proof of stay: a checked-out reservation booked by the user at the hotel. */
	boolean hasCompletedStayAt(UUID hotelId, UUID userId);

	/** Marks a reservation fully paid (called by the billing service on capture). */
	Reservation markFullyPaid(UUID reservationId);
}
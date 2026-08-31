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

	/**
	 * Reference-only lookup, no guest-email proof required — unlike
	 * {@link #getByReferenceAndEmail}, this is NOT a guest-facing self-service
	 * operation. Only for callers that are already authorized some other way
	 * (the payment webhook's shared secret, staff auth) and just need to
	 * resolve a reservation by its human-readable reference for convenience.
	 */
	Reservation getByReference(String reference);

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

	/**
	 * Marks a reservation fully paid (called by the billing service on
	 * capture) and, if it is still on its payment hold ({@code pending}),
	 * promotes it to {@code confirmed} in the same call.
	 */
	Reservation markFullyPaid(UUID reservationId);

	/** Candidate ids for the hold-expiry job (see {@link #expireHold}). */
	List<UUID> findExpiredHoldIds();

	/**
	 * Cancels one reservation whose payment hold has expired, releasing
	 * inventory through the same path as a guest-initiated cancellation. A
	 * no-op if the reservation was already resolved (paid, cancelled, or its
	 * hold extended) by the time this runs — re-checked under a row lock, so
	 * it never races a concurrent capture. Called by the scheduled hold-expiry
	 * job, never directly by a controller.
	 */
	void expireHold(UUID reservationId);
}
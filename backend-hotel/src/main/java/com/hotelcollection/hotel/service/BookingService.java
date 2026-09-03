package com.hotelcollection.hotel.service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.PaymentStatus;
import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.entity.ReservationStatus;
import com.hotelcollection.hotel.entity.Room;
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

	/**
	 * {@code search} matches the reservation reference or the guest's
	 * name/email (case-insensitive substring). {@code sort} is
	 * {@code "<field>-<asc|desc>"} (e.g. {@code "checkInDate-desc"}); an
	 * unrecognized or blank value defaults to {@code createdAt desc}.
	 */
	ReservationPageResult adminReservations(UUID hotelId, ReservationStatus status, String search,
			String sort, PageInput page);

	String cancellationReasonLabel(UUID id);

	/** Proof of stay: a checked-out reservation booked by the user at the hotel. */
	boolean hasCompletedStayAt(UUID hotelId, UUID userId);

	/**
	 * Marks a reservation fully paid (called by the billing service on
	 * capture) and, if it is still on its payment hold ({@code pending}),
	 * promotes it to {@code confirmed} in the same call.
	 */
	Reservation markFullyPaid(UUID reservationId);

	/**
	 * Updates only the reservation's {@code paymentStatus} — called by the
	 * billing service once it has applied a refund to the underlying
	 * payment(s) (see {@code PaymentService#refund}). Never touches
	 * {@code reservation.status}: cancellation itself is what moves that to
	 * {@code cancelled}, independently of whether a refund exists.
	 */
	Reservation markPaymentStatus(UUID reservationId, PaymentStatus paymentStatus);

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

	/**
	 * Assigns a physical room to one room line of a reservation — staff of
	 * the reservation's hotel only. Validates the room belongs to the line's
	 * room type and hotel, is {@code active}, and carries no conflicting
	 * occupancy for the line's stay dates ({@link #eligibleRooms}); CONFLICT
	 * (409) if any of those fail. Writes an {@code AuditService} record.
	 */
	Reservation assignRoom(UUID reservationId, UUID roomLineId, UUID roomId);

	/**
	 * Transitions a {@code confirmed} reservation to {@code checked_in},
	 * writing a {@link com.hotelcollection.hotel.entity.ReservationStatusHistory}
	 * row and an audit record. CONFLICT (409) if the reservation is not
	 * {@code confirmed}, or if any room line still has no room assigned
	 * ("assign rooms before check-in").
	 */
	Reservation checkIn(UUID reservationId);

	/**
	 * Transitions a {@code checked_in} reservation to {@code checked_out},
	 * writing a status-history row and an audit record. CONFLICT (409) if
	 * the reservation is not currently {@code checked_in}.
	 */
	Reservation checkOut(UUID reservationId);

	/**
	 * Active rooms of {@code roomTypeId} free of conflicting occupancy over
	 * {@code [checkIn, checkOut)} — backs the admin room-assignment picker.
	 * Staff of the room type's hotel only.
	 */
	List<Room> eligibleRooms(UUID roomTypeId, LocalDate checkIn, LocalDate checkOut);

	// ---------------------------------------------------------------- OTP-gated self-service lookup
	//
	// getByReferenceAndEmail (above) is deliberately left as-is — it still
	// backs cancellation and the same-session payment-status poller right
	// after booking, neither of which should need an OTP round trip. These
	// three back a *separate* GraphQL query (verifiedReservation) that the
	// "check my reservation later, no account" guest flow uses instead.

	/**
	 * Emails a one-time code if {@code reference}+{@code email} match a real
	 * reservation — but responds identically either way (a silent no-op on a
	 * miss), so this can never be used to test which reference+email pairs
	 * are real. Rate-limited (RateLimitFilter, the {@code /api/v1/reservations}
	 * budget) and, per email, by {@code OtpService}'s own resend cooldown.
	 */
	void requestReservationLookupOtp(String reference, String email);

	/** Confirms the code {@link #requestReservationLookupOtp} sent.
	 * @return a short-lived grant id — pass it to {@link #getByReferenceAndEmailVerified}. */
	UUID verifyReservationLookupOtp(String reference, String email, String code);

	/** The OTP-gated read: {@code reference}+{@code email} must match (same
	 * as {@link #getByReferenceAndEmail}) <em>and</em> {@code lookupToken}
	 * must be a currently-valid grant from {@link #verifyReservationLookupOtp}
	 * for this exact reservation — FORBIDDEN otherwise. */
	Reservation getByReferenceAndEmailVerified(String reference, String email, UUID lookupToken);
}
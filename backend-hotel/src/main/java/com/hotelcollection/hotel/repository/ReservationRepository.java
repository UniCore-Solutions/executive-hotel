package com.hotelcollection.hotel.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.entity.ReservationStatus;

import jakarta.persistence.LockModeType;
import com.hotelcollection.hotel.entity.PaymentStatus;

public interface ReservationRepository extends JpaRepository<Reservation, UUID> {

@Query("select r from Reservation r where r.id = :id")
	Optional<Reservation> findByIdWithLines(@Param("id") UUID id);

	/**
	 * Pessimistic write lock on the reservation row: serializes concurrent
	 * money-affecting operations (payments, captures) on the same
	 * reservation so balance checks cannot race.
	 */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select r from Reservation r where r.id = :id")
	Optional<Reservation> findByIdForUpdate(@Param("id") UUID id);

	@Query("select r from Reservation r where r.reference = upper(:reference)")
	Optional<Reservation> findByReferenceWithLines(@Param("reference") String reference);

	@Query("""
			select r from Reservation r
			left join fetch r.guest g
			where r.reference = :reference
			  and lower(g.email) = lower(:email)
			""")
	Optional<Reservation> findByReferenceAndGuestEmailWithLines(@Param("reference") String reference,
			@Param("email") String email);

	Optional<Reservation> findByIdempotencyKey(String idempotencyKey);

	boolean existsByHotelIdAndBookedByUserIdAndStatus(UUID hotelId, UUID bookedByUserId,
			ReservationStatus status);

	@Query("select r from Reservation r where r.guestId = :guestId order by r.createdAt desc")
	List<Reservation> findByGuestId(@Param("guestId") UUID guestId);

	@Query("select r from Reservation r where r.guestId = :guestId order by r.createdAt desc")
	List<Reservation> findByGuestIdWithLines(@Param("guestId") UUID guestId);

	@Query("""
			select r from Reservation r
			where r.guestId = :guestId and r.hotelId = :hotelId
			order by r.createdAt desc
			""")
	List<Reservation> findByGuestIdAndHotelId(@Param("guestId") UUID guestId,
			@Param("hotelId") UUID hotelId);

	@Query("""
			select r from Reservation r
			where r.guestId in :guestIds and r.hotelId = :hotelId
			order by r.createdAt desc
			""")
	List<Reservation> findByGuestIdsAndHotelId(
			@Param("guestIds") Collection<UUID> guestIds, @Param("hotelId") UUID hotelId);

	@Query("""
			select r from Reservation r
			where r.hotelId = :hotelId
			  and (:status is null or r.status = :status)
			""")
	Page<Reservation> searchByHotel(@Param("hotelId") UUID hotelId,
			@Param("status") ReservationStatus status, Pageable pageable);

	/**
	 * Split from the plain query on purpose — same reason as
	 * {@link GuestRepository#findDistinctByHotelAndPattern}: PostgreSQL cannot
	 * infer the parameter type when the same parameter is used both in a
	 * {@code :query is null} check and a {@code like concat('%', :query, '%')}.
	 * No hardcoded {@code order by} on either variant — the caller's
	 * {@link Pageable}'s {@code Sort} is appended automatically by Spring Data;
	 * the service layer defaults it to {@code createdAt desc} when unspecified.
	 */
	@Query("""
			select r from Reservation r
			join r.guest g
			where r.hotelId = :hotelId
			  and (:status is null or r.status = :status)
			  and (lower(r.reference) like lower(concat('%', :query, '%'))
			       or lower(g.firstName) like lower(concat('%', :query, '%'))
			       or lower(g.lastName) like lower(concat('%', :query, '%'))
			       or lower(g.email) like lower(concat('%', :query, '%')))
			""")
	Page<Reservation> searchByHotelAndQuery(@Param("hotelId") UUID hotelId,
			@Param("status") ReservationStatus status, @Param("query") String query, Pageable pageable);

	default Page<Reservation> searchByHotel(UUID hotelId, ReservationStatus status, String query,
			Pageable pageable) {
		if (query == null || query.isBlank()) {
			return searchByHotel(hotelId, status, pageable);
		}
		return searchByHotelAndQuery(hotelId, status, query, pageable);
	}

	long countByHotelIdAndCheckInDateAndStatusNot(UUID hotelId, java.time.LocalDate checkInDate,
			ReservationStatus status);

	long countByHotelIdAndCheckOutDateAndStatusNot(UUID hotelId, java.time.LocalDate checkOutDate,
			ReservationStatus status);

	/** List form of {@link #countByHotelIdAndCheckInDateAndStatusNot} — dashboard arrivals feed. */
	List<Reservation> findByHotelIdAndCheckInDateAndStatusNotOrderByCreatedAtDesc(UUID hotelId,
			java.time.LocalDate checkInDate, ReservationStatus status);

	/** List form of {@link #countByHotelIdAndCheckOutDateAndStatusNot} — dashboard departures feed. */
	List<Reservation> findByHotelIdAndCheckOutDateAndStatusNotOrderByCreatedAtDesc(UUID hotelId,
			java.time.LocalDate checkOutDate, ReservationStatus status);

	long countByHotelIdAndStatus(UUID hotelId, ReservationStatus status);

	long countByHotelIdAndStatusNot(UUID hotelId, ReservationStatus status);

	long countByHotelIdAndPaymentStatus(UUID hotelId,
			com.hotelcollection.hotel.entity.PaymentStatus paymentStatus);

	@Query("select r from Reservation r where r.hotelId = :hotelId order by r.createdAt desc")
	Page<Reservation> findByHotelIdOrderByCreatedAtDesc(@Param("hotelId") UUID hotelId,
			Pageable pageable);

	@Query("""
			select r.hotelId, count(r) from Reservation r
			where r.hotelId in :hotelIds
			  and r.status <> com.hotelcollection.hotel.entity.ReservationStatus.cancelled
			group by r.hotelId
			""")
	List<Object[]> countActiveByHotelIds(@Param("hotelIds") java.util.Collection<UUID> hotelIds);

	/** Candidate ids for the hold-expiry job — a cheap, unlocked scan; each id is
	 * re-checked under a row lock before being cancelled (see BookingServiceImpl#expireHold). */
	@Query("""
			select r.id from Reservation r
			where r.status = com.hotelcollection.hotel.entity.ReservationStatus.pending
			  and r.holdExpiresAt < :now
			""")
	List<UUID> findExpiredHoldIds(@Param("now") java.time.Instant now);
}
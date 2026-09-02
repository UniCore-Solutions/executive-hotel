package com.hotelcollection.hotel.repository;
import com.hotelcollection.hotel.entity.Reservation;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.Payment;
import com.hotelcollection.hotel.entity.PaymentStatus;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

	List<Payment> findByReservationId(UUID reservationId);

	Optional<Payment> findByProviderAndProviderReference(String provider, String providerReference);

	Optional<Payment> findByIdempotencyKey(String idempotencyKey);

	/**
	 * Payments on reservations of a hotel (back-office). No hardcoded
	 * {@code order by} — the caller's {@link Pageable}'s {@code Sort} is
	 * appended automatically; the service layer defaults it to
	 * {@code createdAt desc} when unspecified.
	 */
	@Query("""
			select p from Payment p
			where p.reservationId in (select r.id from Reservation r where r.hotelId = :hotelId)
			""")
	Page<Payment> findByHotelId(@Param("hotelId") UUID hotelId, Pageable pageable);

	/**
	 * Split from the plain query on purpose — same reason as
	 * {@link GuestRepository#findDistinctByHotelAndPattern}. {@link Payment}
	 * has no direct reservation/guest relation, only a bare {@code
	 * reservationId} FK, so the match is a nested subquery through
	 * {@link Reservation} and its guest.
	 */
	@Query("""
			select p from Payment p
			where p.reservationId in (
				select r.id from Reservation r, com.hotelcollection.hotel.entity.Guest g
				where r.guestId = g.id
				  and r.hotelId = :hotelId
				  and (lower(r.reference) like lower(concat('%', :query, '%'))
				       or lower(g.firstName) like lower(concat('%', :query, '%'))
				       or lower(g.lastName) like lower(concat('%', :query, '%'))
				       or lower(g.email) like lower(concat('%', :query, '%')))
			)
			""")
	Page<Payment> findByHotelIdAndQuery(@Param("hotelId") UUID hotelId, @Param("query") String query,
			Pageable pageable);

	default Page<Payment> findByHotelId(UUID hotelId, String query, Pageable pageable) {
		if (query == null || query.isBlank()) {
			return findByHotelId(hotelId, pageable);
		}
		return findByHotelIdAndQuery(hotelId, query, pageable);
	}

	@Query("""
			select coalesce(sum(p.amount), 0)
			from Payment p
			where p.status = com.hotelcollection.hotel.entity.PaymentStatus.captured
			  and p.reservationId in (select r.id from Reservation r where r.hotelId = :hotelId)
			""")
	BigDecimal sumCapturedByHotelId(@Param("hotelId") UUID hotelId);
}
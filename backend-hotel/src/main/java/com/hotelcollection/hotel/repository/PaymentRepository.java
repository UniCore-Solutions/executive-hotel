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

	/** Payments on reservations of a hotel, newest first (back-office). */
	@Query("""
			select p from Payment p
			where p.reservationId in (select r.id from Reservation r where r.hotelId = :hotelId)
			order by p.createdAt desc
			""")
	Page<Payment> findByHotelId(@Param("hotelId") UUID hotelId, Pageable pageable);

	@Query("""
			select coalesce(sum(p.amount), 0)
			from Payment p
			where p.status = com.hotelcollection.hotel.entity.PaymentStatus.captured
			  and p.reservationId in (select r.id from Reservation r where r.hotelId = :hotelId)
			""")
	BigDecimal sumCapturedByHotelId(@Param("hotelId") UUID hotelId);
}
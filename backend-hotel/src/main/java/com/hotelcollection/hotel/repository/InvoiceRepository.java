package com.hotelcollection.hotel.repository;
import com.hotelcollection.hotel.entity.Reservation;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.Invoice;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

	Optional<Invoice> findByReservationId(UUID reservationId);

	/** Invoices of a hotel's reservations, newest first (back-office). */
	@Query("""
			select i from Invoice i
			where i.reservationId in (select r.id from Reservation r where r.hotelId = :hotelId)
			order by i.issuedAt desc
			""")
	Page<Invoice> findByHotelId(@Param("hotelId") UUID hotelId, Pageable pageable);

	@Query("""
			select count(i) from Invoice i
			where i.reservationId in (select r.id from Reservation r where r.hotelId = :hotelId)
			""")
	long countByHotelId(@Param("hotelId") UUID hotelId);
}
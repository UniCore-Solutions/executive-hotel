package com.hotelcollection.hotel.repository;
import com.hotelcollection.hotel.entity.Reservation;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.Invoice;

import jakarta.persistence.LockModeType;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

	Optional<Invoice> findByReservationId(UUID reservationId);

	/** Pessimistic write lock: serializes concurrent PDF-generation attempts
	 * for the same invoice so at most one caller renders/stores the file. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select i from Invoice i where i.id = :id")
	Optional<Invoice> findByIdForUpdate(@Param("id") UUID id);

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
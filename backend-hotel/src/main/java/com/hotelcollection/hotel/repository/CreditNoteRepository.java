package com.hotelcollection.hotel.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.CreditNote;

import jakarta.persistence.LockModeType;

public interface CreditNoteRepository extends JpaRepository<CreditNote, UUID> {

	Optional<CreditNote> findByReservationId(UUID reservationId);

	/** Pessimistic write lock: serializes concurrent PDF-generation attempts
	 * for the same credit note so at most one caller renders/stores the file. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select c from CreditNote c where c.id = :id")
	Optional<CreditNote> findByIdForUpdate(@Param("id") UUID id);
}

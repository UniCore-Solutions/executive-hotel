package com.hotelcollection.hotel.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hotelcollection.hotel.entity.CreditNote;

public interface CreditNoteRepository extends JpaRepository<CreditNote, UUID> {

	Optional<CreditNote> findByReservationId(UUID reservationId);
}

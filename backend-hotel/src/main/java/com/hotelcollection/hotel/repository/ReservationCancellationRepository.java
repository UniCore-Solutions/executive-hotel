package com.hotelcollection.hotel.repository;

import java.util.Optional;
import java.util.UUID;

import com.hotelcollection.hotel.entity.ReservationCancellation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationCancellationRepository extends JpaRepository<ReservationCancellation, UUID> {

	Optional<ReservationCancellation> findByReservationId(UUID reservationId);
}
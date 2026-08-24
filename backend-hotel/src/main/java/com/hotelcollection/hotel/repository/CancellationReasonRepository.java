package com.hotelcollection.hotel.repository;

import java.util.Optional;
import java.util.UUID;

import com.hotelcollection.hotel.entity.CancellationReason;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CancellationReasonRepository extends JpaRepository<CancellationReason, UUID> {

	Optional<CancellationReason> findByCode(String code);
}
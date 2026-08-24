package com.hotelcollection.hotel.repository;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.hotelcollection.hotel.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

	Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

	Page<AuditLog> findByHotelIdOrderByCreatedAtDesc(UUID hotelId, Pageable pageable);
}

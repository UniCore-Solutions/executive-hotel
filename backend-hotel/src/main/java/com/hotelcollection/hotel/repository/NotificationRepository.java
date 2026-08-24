package com.hotelcollection.hotel.repository;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.hotelcollection.hotel.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

	Page<Notification> findByHotelIdOrderByCreatedAtDesc(UUID hotelId, Pageable pageable);
}

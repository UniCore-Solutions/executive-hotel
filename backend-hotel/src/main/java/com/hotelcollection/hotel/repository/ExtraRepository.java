package com.hotelcollection.hotel.repository;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Extra;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExtraRepository extends JpaRepository<Extra, UUID> {

	List<Extra> findByHotelIdAndStatusOrderByName(UUID hotelId, String status);

	List<Extra> findByHotelIdOrderByName(UUID hotelId);
}
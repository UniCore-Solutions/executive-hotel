package com.hotelcollection.hotel.repository;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.HotelPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HotelPolicyRepository extends JpaRepository<HotelPolicy, UUID> {

	List<HotelPolicy> findByHotelIdOrderBySortOrder(UUID hotelId);

	void deleteByHotelId(UUID hotelId);
}

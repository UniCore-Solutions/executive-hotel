package com.hotelcollection.hotel.repository;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.RateRestriction;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RateRestrictionRepository extends JpaRepository<RateRestriction, UUID> {

	List<RateRestriction> findByRoomTypeRatePlanId(UUID roomTypeRatePlanId);

	void deleteByRoomTypeRatePlanId(UUID roomTypeRatePlanId);
}

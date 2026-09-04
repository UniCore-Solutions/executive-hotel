package com.hotelcollection.hotel.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hotelcollection.hotel.entity.Season;

public interface SeasonRepository extends JpaRepository<Season, UUID> {

	List<Season> findByHotelIdOrderByStartDateAsc(UUID hotelId);
}

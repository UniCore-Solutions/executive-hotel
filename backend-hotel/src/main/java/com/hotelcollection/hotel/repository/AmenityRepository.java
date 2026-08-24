package com.hotelcollection.hotel.repository;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Amenity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AmenityRepository extends JpaRepository<Amenity, UUID> {

	List<Amenity> findAllByOrderByCategoryAscNameAsc();
}
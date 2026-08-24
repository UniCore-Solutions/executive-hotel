package com.hotelcollection.hotel.repository;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Restaurant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RestaurantRepository extends JpaRepository<Restaurant, UUID> {

	List<Restaurant> findByHotelIdAndStatusOrderBySortOrder(UUID hotelId, String status);
}
package com.hotelcollection.hotel.repository;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Faq;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FaqRepository extends JpaRepository<Faq, UUID> {

	List<Faq> findByHotelIdOrderBySortOrder(UUID hotelId);
}
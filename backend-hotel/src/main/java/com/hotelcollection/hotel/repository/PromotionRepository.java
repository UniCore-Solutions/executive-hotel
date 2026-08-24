package com.hotelcollection.hotel.repository;
import com.hotelcollection.hotel.entity.Hotel;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.Promotion;

public interface PromotionRepository extends JpaRepository<Promotion, UUID> {

	Optional<Promotion> findByCodeIgnoreCase(String code);

	@Query("""
			select p from Promotion p
			where p.status = 'active'
			  and (p.hotelId = :hotelId or p.hotelId is null)
			""")
	List<Promotion> findActiveByHotelId(@Param("hotelId") UUID hotelId);

	/** Hotel promotions plus platform-wide ones, newest first (back-office). */
	@Query("select p from Promotion p where p.hotelId = :hotelId or p.hotelId is null order by p.createdAt desc")
	List<Promotion> findForHotel(@Param("hotelId") UUID hotelId);
}
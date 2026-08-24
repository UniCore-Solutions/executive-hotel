package com.hotelcollection.hotel.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.RatePlan;

public interface RatePlanRepository extends JpaRepository<RatePlan, UUID> {

	List<RatePlan> findByIdIn(Collection<UUID> ids);

	@Query("select rp from RatePlan rp where rp.hotelId = :hotelId and rp.status = 'active' order by rp.name")
	List<RatePlan> findActiveByHotelId(@Param("hotelId") UUID hotelId);

	@Query("select rp from RatePlan rp where rp.id in :ids and rp.status = 'active'")
	List<RatePlan> findActiveByIds(@Param("ids") Collection<UUID> ids);

	@Query("""
			select rp from RatePlan rp
			where rp.hotelId = :hotelId
			  and rp.status = 'active'
			  and (:from is null or rp.minStay is null or rp.minStay <= :from)
			""")
	List<RatePlan> findActiveByHotelIdAndStay(@Param("hotelId") UUID hotelId,
			@Param("from") Integer nights);

	Optional<RatePlan> findByIdAndHotelId(UUID id, UUID hotelId);

	Optional<RatePlan> findByHotelIdAndCode(UUID hotelId, String code);

	@Query("select rp from RatePlan rp where rp.hotelId = :hotelId order by rp.name")
	List<RatePlan> findByHotelId(@Param("hotelId") UUID hotelId);
}
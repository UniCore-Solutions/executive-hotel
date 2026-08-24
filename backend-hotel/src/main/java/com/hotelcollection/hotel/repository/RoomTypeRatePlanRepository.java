package com.hotelcollection.hotel.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.RoomTypeRatePlan;

public interface RoomTypeRatePlanRepository extends JpaRepository<RoomTypeRatePlan, UUID> {

	@Query("""
			select l from RoomTypeRatePlan l
			where l.hotelId = :hotelId
			  and l.roomTypeId in :roomTypeIds
			""")
	List<RoomTypeRatePlan> findByHotelIdAndRoomTypeIds(@Param("hotelId") UUID hotelId,
			@Param("roomTypeIds") Collection<UUID> roomTypeIds);

	@Query("select l from RoomTypeRatePlan l where l.hotelId = :hotelId")
	List<RoomTypeRatePlan> findByHotelId(@Param("hotelId") UUID hotelId);

	List<RoomTypeRatePlan> findByIdIn(Collection<UUID> ids);

	Optional<RoomTypeRatePlan> findByIdAndHotelId(UUID id, UUID hotelId);

	@Query("select l from RoomTypeRatePlan l where l.roomTypeId = :roomTypeId and l.ratePlanId = :ratePlanId")
	Optional<RoomTypeRatePlan> findOffer(@Param("roomTypeId") UUID roomTypeId,
			@Param("ratePlanId") UUID ratePlanId);

	@Query("select l from RoomTypeRatePlan l where l.ratePlanId = :ratePlanId")
	List<RoomTypeRatePlan> findByRatePlanId(@Param("ratePlanId") UUID ratePlanId);

	@Query("select l from RoomTypeRatePlan l where l.ratePlanId in :ratePlanIds")
	List<RoomTypeRatePlan> findByRatePlanIds(@Param("ratePlanIds") Collection<UUID> ratePlanIds);
}
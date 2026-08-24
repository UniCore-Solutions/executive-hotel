package com.hotelcollection.hotel.repository;
import com.hotelcollection.hotel.entity.RoomTypeRatePlan;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.RatePlanPrice;

public interface RatePlanPriceRepository extends JpaRepository<RatePlanPrice, UUID> {

	/** Current nightly price for the given offered pairs on {@code date}. */
	@Query("""
			select p from RatePlanPrice p
			where p.roomTypeRatePlanId in :linkIds
			  and p.validFrom <= :date and p.validTo >= :date
			""")
	List<RatePlanPrice> findCurrentByLinkIds(@Param("linkIds") Collection<UUID> linkIds,
			@Param("date") LocalDate date);

	/** Lowest current nightly price per hotel (display "from" price, batched). */
	@Query("""
			select l.hotelId, min(p.priceAmount)
			from RatePlanPrice p
			join RoomTypeRatePlan l on l.id = p.roomTypeRatePlanId
			where l.hotelId in :hotelIds
			  and p.validFrom <= :date and p.validTo >= :date
			group by l.hotelId
			""")
	List<Object[]> minPriceByHotelIds(@Param("hotelIds") Collection<UUID> hotelIds,
			@Param("date") LocalDate date);

	/** All price rows of an offered pair, oldest first (back-office pricing screen). */
	@Query("select p from RatePlanPrice p where p.roomTypeRatePlanId = :linkId order by p.validFrom")
	List<RatePlanPrice> findByRoomTypeRatePlanId(UUID linkId);

	@Query("select p from RatePlanPrice p where p.roomTypeRatePlanId in :linkIds order by p.validFrom")
	List<RatePlanPrice> findByRoomTypeRatePlanIds(@Param("linkIds") Collection<UUID> linkIds);

	/** Bulk delete (immediate) so a price-sheet replacement's new rows never
	 * collide with the old ones via the EXCLUDE overlap constraint. */
	@Modifying
	@Query("delete from RatePlanPrice p where p.roomTypeRatePlanId = :linkId")
	void deleteByRoomTypeRatePlanId(@Param("linkId") UUID linkId);

	/** Lowest current nightly price per room type (display "from" price, batched). */
	@Query("""
			select l.roomTypeId, min(p.priceAmount)
			from RatePlanPrice p
			join RoomTypeRatePlan l on l.id = p.roomTypeRatePlanId
			where l.roomTypeId in :roomTypeIds
			  and p.validFrom <= :date and p.validTo >= :date
			group by l.roomTypeId
			""")
	List<Object[]> minPriceByRoomTypeIds(@Param("roomTypeIds") Collection<UUID> roomTypeIds,
			@Param("date") LocalDate date);
	<S extends RatePlanPrice> S save(S entity);
	void deleteAll();
}
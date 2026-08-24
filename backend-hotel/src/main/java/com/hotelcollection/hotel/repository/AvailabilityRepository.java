package com.hotelcollection.hotel.repository;
import com.hotelcollection.hotel.entity.RoomType;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.Availability;

import jakarta.persistence.LockModeType;

public interface AvailabilityRepository extends JpaRepository<Availability, UUID> {

	@Query("select a from Availability a where a.roomTypeId in :roomTypeIds and a.stayDate between :from and :to")
	List<Availability> findByRoomTypeIdsAndRange(@Param("roomTypeIds") Collection<UUID> roomTypeIds,
			@Param("from") LocalDate from, @Param("to") LocalDate to);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select a from Availability a where a.roomTypeId in :roomTypeIds and a.stayDate between :from and :to")
	List<Availability> lockByRoomTypeIdsAndRange(@Param("roomTypeIds") Collection<UUID> roomTypeIds,
			@Param("from") LocalDate from, @Param("to") LocalDate to);

	Optional<Availability> findByRoomTypeIdAndStayDate(UUID roomTypeId, LocalDate stayDate);

	/**
	 * Sparse model: make sure a row exists for the night. A missing row means
	 * fully available, so booking only materializes the nights of a stay.
	 */
	@Modifying(flushAutomatically = true, clearAutomatically = true)
	@Query(value = """
			insert into availability (id, room_type_id, stay_date, rooms_sold, out_of_order, blocked, version)
			values (gen_random_uuid(), :roomTypeId, :stayDate, 0, 0, 0, 0)
			on conflict (room_type_id, stay_date) do nothing
			""", nativeQuery = true)
	void ensureRow(@Param("roomTypeId") UUID roomTypeId, @Param("stayDate") LocalDate stayDate);

	@Query("""
			select a from Availability a
			where a.roomTypeId in (select rt.id from RoomType rt where rt.hotelId = :hotelId)
			  and a.stayDate between :from and :to
			order by a.stayDate, a.roomTypeId
			""")
	List<Availability> findByHotelIdAndRange(@Param("hotelId") UUID hotelId,
			@Param("from") LocalDate from, @Param("to") LocalDate to);

	/** Highest combined (sold + out_of_order + blocked) across all nights of a room type. */
	@Query("""
			select coalesce(max(a.roomsSold + a.outOfOrder + a.blocked), 0)
			from Availability a
			where a.roomTypeId = :roomTypeId
			""")
	int maxSoldUnits(@Param("roomTypeId") UUID roomTypeId);

	/** Inventory totals for a hotel on one date (dashboard occupancy). */
	@Query("""
			select coalesce(sum(rt.totalInventory), 0), coalesce(sum(a.roomsSold), 0),
			       coalesce(sum(a.outOfOrder), 0), coalesce(sum(a.blocked), 0)
			from RoomType rt
			left join Availability a on a.roomTypeId = rt.id and a.stayDate = :date
			where rt.hotelId = :hotelId
			""")
	Object[] totalsByHotelAndDate(@Param("hotelId") UUID hotelId, @Param("date") LocalDate date);
}
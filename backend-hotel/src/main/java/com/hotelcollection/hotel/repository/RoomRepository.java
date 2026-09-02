package com.hotelcollection.hotel.repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.ReservationStatus;
import com.hotelcollection.hotel.entity.Room;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

/**
 * Physical rooms. Inventory is derived from these rows: a room type's
 * capacity is the count of its ACTIVE rooms (V26 trigger keeps
 * room_types.total_inventory in sync).
 */
public interface RoomRepository extends JpaRepository<Room, UUID> {

	List<Room> findByHotelIdOrderByRoomNumber(UUID hotelId);

	List<Room> findByRoomTypeIdOrderByRoomNumber(UUID roomTypeId);

	List<Room> findByRoomTypeIdInOrderByRoomNumber(Collection<UUID> roomTypeIds);

	boolean existsByHotelIdAndRoomNumber(UUID hotelId, String roomNumber);

	@Query("select count(r) from Room r where r.roomTypeId = :roomTypeId and r.status = 'active'")
	long countActiveByRoomTypeId(@Param("roomTypeId") UUID roomTypeId);

	/**
	 * Active rooms of a room type free of conflicting occupancy over
	 * {@code [checkIn, checkOut)} — a half-open interval, matching the
	 * sparse per-night convention {@code InventoryServiceImpl} already uses
	 * for inventory locking (a stay occupies checkIn..checkOut-1 inclusive;
	 * the checkout day itself is free for a new arrival, hence
	 * {@code checkInDate < :checkOut and checkOutDate > :checkIn}).
	 * "Occupied" means assigned to a room line of a reservation whose status
	 * is one of {@code statuses} (typically confirmed/pending/checked_in — a
	 * cancelled or checked-out reservation no longer holds the room).
	 * {@code excludeRoomLineId} lets a room being (re)assigned to its own
	 * line not conflict with itself; pass {@code null} for a plain listing
	 * (the eligible-rooms picker).
	 */
	@Query("""
			select r from Room r
			where r.roomTypeId = :roomTypeId
			  and r.status = 'active'
			  and r.id not in (
			      select rr.roomId from ReservationRoom rr
			      where rr.roomId is not null
			        and rr.reservationId in (
			            select res.id from Reservation res where res.status in :statuses
			        )
			        and rr.checkInDate < :checkOut
			        and rr.checkOutDate > :checkIn
			        and (:excludeRoomLineId is null or rr.id <> :excludeRoomLineId)
			  )
			order by r.roomNumber
			""")
	List<Room> findAvailableRooms(@Param("roomTypeId") UUID roomTypeId,
			@Param("checkIn") LocalDate checkIn, @Param("checkOut") LocalDate checkOut,
			@Param("statuses") Collection<ReservationStatus> statuses,
			@Param("excludeRoomLineId") UUID excludeRoomLineId);
}

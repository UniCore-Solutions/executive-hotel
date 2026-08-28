package com.hotelcollection.hotel.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

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
}

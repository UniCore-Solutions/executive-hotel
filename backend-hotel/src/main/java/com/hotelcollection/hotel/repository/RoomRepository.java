package com.hotelcollection.hotel.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;

/** Physical rooms (operational state only; inventory lives in availability, C9). */
public interface RoomRepository extends JpaRepository<Room, UUID> {

	List<Room> findByHotelIdOrderByRoomNumber(UUID hotelId);

	List<Room> findByRoomTypeIdOrderByRoomNumber(UUID roomTypeId);

	List<Room> findByRoomTypeIdInOrderByRoomNumber(Collection<UUID> roomTypeIds);

	boolean existsByHotelIdAndRoomNumber(UUID hotelId, String roomNumber);
}

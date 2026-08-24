package com.hotelcollection.hotel.dto.catalog;
import java.util.UUID;

/** Physical room create/update input (back-office). */
public record AdminRoomInput(UUID roomTypeId, String roomNumber, String floor, String status,
		String housekeepingStatus, String maintenanceStatus) {
}

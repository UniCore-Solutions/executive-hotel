package com.hotelcollection.hotel.service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Inventory locking/selling use cases used by the booking flow within
 * the booking transaction. Rows are materialized (upsert) and locked per
 * night so concurrent bookings serialize on the row lock.
 */
public interface InventoryService {

	/**
	 * Lock and sell {@code nights} of inventory for the given room types.
	 * Throws a conflict when any night has insufficient free units.
	 */
	void lockAndSell(UUID hotelId, List<InventoryRequirement> requirements, LocalDate checkIn,
			int nights);

	/** Release previously sold inventory (cancellation); empty rows are removed. */
	void release(UUID hotelId, List<InventoryRequirement> requirements, LocalDate checkIn,
			int nights);

	/** Units needed of a room type. */
	record InventoryRequirement(UUID roomTypeId, int units) {
	}
}
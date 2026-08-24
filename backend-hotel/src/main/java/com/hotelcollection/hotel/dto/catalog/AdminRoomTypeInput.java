package com.hotelcollection.hotel.dto.catalog;
import com.hotelcollection.hotel.entity.Room;

import java.math.BigDecimal;

/** Room type create/update input (back-office). */
public record AdminRoomTypeInput(String name, String description, String longDescription,
		Integer maxAdults, Integer maxChildren, String bedConfiguration, BigDecimal sizeSqm,
		String viewType, String status, Integer totalInventory) {
}

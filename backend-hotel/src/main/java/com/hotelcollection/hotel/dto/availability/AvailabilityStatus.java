package com.hotelcollection.hotel.dto.availability;
import com.hotelcollection.hotel.entity.Availability;

/** Availability status of a room type for a stay (mirrors the GraphQL enum). */
public enum AvailabilityStatus {
	available, few, soldout
}
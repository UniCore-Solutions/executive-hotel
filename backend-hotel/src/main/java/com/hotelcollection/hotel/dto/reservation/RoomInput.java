package com.hotelcollection.hotel.dto.reservation;
import java.util.UUID;

public record RoomInput(UUID roomTypeId, UUID ratePlanId) {
}
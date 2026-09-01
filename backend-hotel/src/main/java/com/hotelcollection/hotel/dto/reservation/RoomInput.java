package com.hotelcollection.hotel.dto.reservation;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record RoomInput(
		@NotNull(message = "roomTypeId is required") UUID roomTypeId,
		@NotNull(message = "ratePlanId is required") UUID ratePlanId) {
}

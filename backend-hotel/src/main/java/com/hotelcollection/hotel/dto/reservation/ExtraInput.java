package com.hotelcollection.hotel.dto.reservation;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ExtraInput(
		@NotNull(message = "extraId is required") UUID extraId,
		@Positive(message = "extra quantity must be positive") int quantity) {
}

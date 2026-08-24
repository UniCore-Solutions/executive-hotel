package com.hotelcollection.hotel.dto.review;
import java.util.UUID;

public record CreateReviewInput(UUID hotelId, UUID reservationId, int rating, String title,
		String comment) {
}
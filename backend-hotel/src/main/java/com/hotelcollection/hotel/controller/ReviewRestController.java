package com.hotelcollection.hotel.controller;
import java.util.UUID;
import com.hotelcollection.hotel.entity.Guest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hotelcollection.hotel.entity.Review;
import com.hotelcollection.hotel.dto.review.CreateReviewInput;
import com.hotelcollection.hotel.service.ReviewService;

/** Guest review creation (checked-out stay required, enforced in ReviewService). */
@RestController
@RequestMapping("/api/v1/hotels/{hotelId}/reviews")
public class ReviewRestController {

	private final ReviewService reviewService;

	public ReviewRestController(ReviewService reviewService) {
		this.reviewService = reviewService;
	}

	@PostMapping
	public ResponseEntity<Review> create(@PathVariable UUID hotelId,
			@RequestBody ReviewRequest in) {
		Review review = reviewService.create(new CreateReviewInput(hotelId, in.reservationId(),
				in.rating(), in.title(), in.comment()));
		return ResponseEntity.status(HttpStatus.CREATED).body(review);
	}

	/** Transport-specific body (hotelId comes from the path). */
	public record ReviewRequest(UUID reservationId, int rating, String title, String comment) {
	}
}
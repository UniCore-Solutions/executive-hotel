package com.hotelcollection.hotel.controller;

import java.util.UUID;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hotelcollection.hotel.entity.Review;
import com.hotelcollection.hotel.entity.ReviewModerationStatus;
import com.hotelcollection.hotel.service.ReviewService;

/**
 * Back-office review action endpoint (moderation). Authorization (hotel
 * scoping) is enforced inside {@link ReviewService}.
 */
@RestController
@RequestMapping("/api/v1/admin/reviews")
public class AdminReviewRestController {

	private final ReviewService review;

	public AdminReviewRestController(ReviewService review) {
		this.review = review;
	}

	@PostMapping("/{id}/moderation")
	public Review moderate(@PathVariable UUID id, @RequestBody ModerateRequest in) {
		return review.moderate(id, in.status(), in.response());
	}

	/** Transport-specific body for the moderation action. */
	public record ModerateRequest(ReviewModerationStatus status, String response) {
	}
}

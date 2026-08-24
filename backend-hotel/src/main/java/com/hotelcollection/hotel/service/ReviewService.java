package com.hotelcollection.hotel.service;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Review;
import com.hotelcollection.hotel.entity.ReviewModerationStatus;
import com.hotelcollection.hotel.dto.PageInput;
import com.hotelcollection.hotel.dto.review.CreateReviewInput;
import com.hotelcollection.hotel.dto.review.ReviewPage;

/**
 * Review use cases. Public reads expose only approved reviews; moderation
 * (approve/reject) is a staff operation with the hotel-scoping check
 * enforced internally.
 */
public interface ReviewService {

	Review create(CreateReviewInput in);

	List<Review> approvedReviews(UUID hotelId);

	ReviewPage pagedApproved(UUID hotelId, PageInput page);

	long countApproved(UUID hotelId);

	Double averageRating(UUID hotelId);

	Map<UUID, Double> avgRatingByHotelIds(Collection<UUID> ids);

	Review moderate(UUID reviewId, ReviewModerationStatus status, String response);

	/** Back-office review listing with optional moderation filter. */
	org.springframework.data.domain.Page<Review> adminReviews(UUID hotelId,
			ReviewModerationStatus status, PageInput page);
}
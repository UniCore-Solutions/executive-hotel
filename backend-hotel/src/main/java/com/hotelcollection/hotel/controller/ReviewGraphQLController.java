package com.hotelcollection.hotel.controller;
import java.util.UUID;


import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import com.hotelcollection.hotel.dto.PageInput;
import com.hotelcollection.hotel.dto.review.CreateReviewInput;
import com.hotelcollection.hotel.dto.review.ReviewPage;
import com.hotelcollection.hotel.entity.Review;
import com.hotelcollection.hotel.entity.ReviewModerationStatus;
import com.hotelcollection.hotel.service.ReviewService;

/** Review GraphQL controller: guest review creation, staff moderation, public reads. */
@Controller
public class ReviewGraphQLController {

	private final ReviewService review;

	public ReviewGraphQLController(ReviewService review) {
		this.review = review;
	}

	@MutationMapping
	public Review createReview(@Argument CreateReviewInput input) {
		return review.create(input);
	}

	@MutationMapping
	public Review moderateReview(@Argument UUID id, @Argument ReviewModerationStatus status,
			@Argument String response) {
		return review.moderate(id, status, response);
	}

	@QueryMapping
	public ReviewPage reviews(@Argument UUID hotelId, @Argument PageInput page) {
		return review.pagedApproved(hotelId, page);
	}
}
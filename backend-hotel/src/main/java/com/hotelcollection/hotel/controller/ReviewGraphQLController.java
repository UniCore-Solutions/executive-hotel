package com.hotelcollection.hotel.controller;
import java.util.UUID;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import com.hotelcollection.hotel.dto.PageInput;
import com.hotelcollection.hotel.dto.review.ReviewPage;
import com.hotelcollection.hotel.service.ReviewService;

/**
 * Review GraphQL controller — READ side only (API rule: GraphQL = READ,
 * REST = WRITE/ACTION). Review creation and moderation are REST writes
 * (POST /api/v1/hotels/{hotelId}/reviews, /api/v1/admin/reviews/{id}/moderation).
 */
@Controller
public class ReviewGraphQLController {

	private final ReviewService review;

	public ReviewGraphQLController(ReviewService review) {
		this.review = review;
	}

	@QueryMapping
	public ReviewPage reviews(@Argument UUID hotelId, @Argument PageInput page) {
		return review.pagedApproved(hotelId, page);
	}
}

package com.hotelcollection.hotel.controller;

import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import com.hotelcollection.hotel.dto.homepage.HomepageData;
import com.hotelcollection.hotel.service.HomepageService;

/** Homepage GraphQL controller: curated guest-frontend sections. */
@Controller
public class HomepageGraphQLController {

	private final HomepageService homepage;

	public HomepageGraphQLController(HomepageService homepage) {
		this.homepage = homepage;
	}

	@QueryMapping
	public HomepageData homepage() {
		return homepage.homepage();
	}
}
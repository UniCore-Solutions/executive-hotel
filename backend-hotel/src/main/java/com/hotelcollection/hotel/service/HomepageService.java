package com.hotelcollection.hotel.service;

import com.hotelcollection.hotel.dto.homepage.HomepageData;

/** Homepage read use case: curated sections for the guest frontend. */
public interface HomepageService {

	HomepageData homepage();
}
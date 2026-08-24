package com.hotelcollection.hotel.service.impl;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.dto.homepage.HomepageData;
import com.hotelcollection.hotel.repository.ExperienceRepository;
import com.hotelcollection.hotel.repository.HotelRepository;
import com.hotelcollection.hotel.repository.ReviewRepository;
import com.hotelcollection.hotel.repository.RoomTypeRepository;
import com.hotelcollection.hotel.service.HomepageService;

/** Curated homepage sections; featured flags live on the rows (seed/operator). */
@Service
public class HomepageServiceImpl implements HomepageService {

	private final HotelRepository hotelRepository;
	private final RoomTypeRepository roomTypeRepository;
	private final ExperienceRepository experienceRepository;
	private final ReviewRepository reviewRepository;

	public HomepageServiceImpl(HotelRepository hotelRepository, RoomTypeRepository roomTypeRepository,
			ExperienceRepository experienceRepository, ReviewRepository reviewRepository) {
		this.hotelRepository = hotelRepository;
		this.roomTypeRepository = roomTypeRepository;
		this.experienceRepository = experienceRepository;
		this.reviewRepository = reviewRepository;
	}

	@Override
	@Transactional(readOnly = true)
	public HomepageData homepage() {
		return new HomepageData(
				hotelRepository.findFeaturedOnHomepage(),
				roomTypeRepository.findFeaturedOnHomepage(),
				experienceRepository.findFeaturedOnHomepage(),
				reviewRepository.findFeaturedOnHomepage());
	}
}
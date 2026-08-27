package com.hotelcollection.hotel.service.impl;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.entity.HotelPolicy;
import com.hotelcollection.hotel.repository.HotelPolicyRepository;
import com.hotelcollection.hotel.service.HotelPolicyQueryService;

@Service
public class HotelPolicyQueryServiceImpl implements HotelPolicyQueryService {

	private final HotelPolicyRepository hotelPolicyRepository;

	public HotelPolicyQueryServiceImpl(HotelPolicyRepository hotelPolicyRepository) {
		this.hotelPolicyRepository = hotelPolicyRepository;
	}

	@Override
	@Transactional(readOnly = true)
	public List<HotelPolicy> policies(UUID hotelId) {
		return hotelPolicyRepository.findByHotelIdOrderBySortOrder(hotelId);
	}
}

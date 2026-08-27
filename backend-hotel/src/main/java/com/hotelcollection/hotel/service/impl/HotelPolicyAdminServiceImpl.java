package com.hotelcollection.hotel.service.impl;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.dto.catalog.HotelPolicyInput;
import com.hotelcollection.hotel.entity.HotelPolicy;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.repository.HotelPolicyRepository;
import com.hotelcollection.hotel.service.HotelPolicyAdminService;

/**
 * Back-office hotel-policy writes: replace the policy set of a hotel
 * (delete-then-insert, mirroring MediaAdminServiceImpl.replaceHotelMedia —
 * a hotel's policies have no independent identity worth preserving across
 * an edit).
 */
@Service
public class HotelPolicyAdminServiceImpl implements HotelPolicyAdminService {

	private final HotelPolicyRepository hotelPolicyRepository;

	public HotelPolicyAdminServiceImpl(HotelPolicyRepository hotelPolicyRepository) {
		this.hotelPolicyRepository = hotelPolicyRepository;
	}

	@Override
	@Transactional
	public List<HotelPolicy> replaceHotelPolicies(UUID hotelId, List<HotelPolicyInput> inputs) {
		hotelPolicyRepository.deleteByHotelId(hotelId);
		List<HotelPolicyInput> in = inputs == null ? List.of() : inputs;
		List<HotelPolicy> created = new ArrayList<>();
		Instant now = Instant.now();
		for (HotelPolicyInput p : in) {
			if (p.name() == null || p.name().isBlank()) {
				throw DomainException.validation("policy name is required");
			}
			if (p.value() == null || p.value().isBlank()) {
				throw DomainException.validation("policy value is required");
			}
			HotelPolicy policy = new HotelPolicy();
			policy.setHotelId(hotelId);
			policy.setName(p.name().trim());
			policy.setValue(p.value().trim());
			policy.setIcon(p.icon());
			policy.setSortOrder(p.sortOrder() == null ? 0 : p.sortOrder().shortValue());
			policy.setCreatedAt(now);
			policy.setUpdatedAt(now);
			created.add(policy);
		}
		return hotelPolicyRepository.saveAll(created);
	}
}

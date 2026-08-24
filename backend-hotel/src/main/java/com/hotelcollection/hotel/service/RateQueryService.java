package com.hotelcollection.hotel.service;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Promotion;
import com.hotelcollection.hotel.entity.RatePlan;
import com.hotelcollection.hotel.dto.rate.AdminPromotionView;
import com.hotelcollection.hotel.dto.rate.AdminRatePlanView;

/** Rate read use cases: offers, plans, promotions and min-price loaders. */
public interface RateQueryService {

	/** Active promotions for a hotel within their booking window. */
	List<Promotion> offers(UUID hotelId);

	/** All rate plans of a hotel (admin back-office read). */
	List<RatePlan> ratePlans(UUID hotelId);

	/** A single rate plan by id (cancellation evaluation), or null if deleted. */
	RatePlan ratePlanById(UUID id);

	/** Promotions for back-office listing (includes expired/inactive). */
	List<AdminPromotionView> promotions(UUID hotelId);

	/** Rate plans with links + price ranges resolved (admin workspace read). */
	List<AdminRatePlanView> ratePlanWorkspace(UUID hotelId);

	Map<UUID, Integer> minPriceByHotelIds(Collection<UUID> ids);

	Map<UUID, Integer> minPriceByRoomTypeIds(Collection<UUID> ids);
}
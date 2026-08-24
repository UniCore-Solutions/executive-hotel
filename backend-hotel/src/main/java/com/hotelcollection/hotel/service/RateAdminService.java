package com.hotelcollection.hotel.service;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.RatePlan;
import com.hotelcollection.hotel.dto.rate.AdminPromotionInput;
import com.hotelcollection.hotel.dto.rate.AdminPromotionView;
import com.hotelcollection.hotel.dto.rate.AdminRatePlanInput;
import com.hotelcollection.hotel.dto.rate.RatePlanPriceInfoView;
import com.hotelcollection.hotel.dto.rate.RatePlanPriceInput;
import com.hotelcollection.hotel.dto.rate.RoomTypeRatePlanInfoView;

/**
 * Back-office rate write use cases (rate plans, links, price ranges,
 * promotions). Authorization (hotel scoping / super_admin) is enforced
 * internally.
 */
public interface RateAdminService {

	RatePlan createRatePlan(UUID hotelId, AdminRatePlanInput in);

	RatePlan updateRatePlan(UUID id, AdminRatePlanInput in);

	RoomTypeRatePlanInfoView linkRoomTypeRatePlan(UUID roomTypeId, UUID ratePlanId);

	boolean unlinkRoomTypeRatePlan(UUID linkId);

	List<RatePlanPriceInfoView> setRatePlanPrices(UUID linkId, List<RatePlanPriceInput> prices);

	AdminPromotionView createPromotion(UUID hotelId, AdminPromotionInput in);

	AdminPromotionView updatePromotion(UUID id, AdminPromotionInput in);

	AdminPromotionView setPromotionStatus(UUID id, String status);
}
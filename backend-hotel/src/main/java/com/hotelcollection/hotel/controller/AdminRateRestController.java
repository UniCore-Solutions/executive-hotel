package com.hotelcollection.hotel.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hotelcollection.hotel.dto.rate.AdminPromotionInput;
import com.hotelcollection.hotel.dto.rate.AdminPromotionView;
import com.hotelcollection.hotel.dto.rate.AdminRatePlanInput;
import com.hotelcollection.hotel.dto.rate.RatePlanPriceInfoView;
import com.hotelcollection.hotel.dto.rate.RatePlanPriceInput;
import com.hotelcollection.hotel.dto.rate.RoomTypeRatePlanInfoView;
import com.hotelcollection.hotel.entity.RatePlan;
import com.hotelcollection.hotel.service.RateAdminService;

/**
 * Back-office rate write endpoints (rate plans, room-type links, price
 * ranges, promotions). Authorization is enforced inside
 * {@link RateAdminService}.
 */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminRateRestController {

	private final RateAdminService rate;

	public AdminRateRestController(RateAdminService rate) {
		this.rate = rate;
	}

	// ---------------------------------------------------------------- rate plans

	@PostMapping("/hotels/{hotelId}/rate-plans")
	public ResponseEntity<RatePlan> createRatePlan(@PathVariable UUID hotelId,
			@RequestBody AdminRatePlanInput in) {
		return ResponseEntity.status(HttpStatus.CREATED).body(rate.createRatePlan(hotelId, in));
	}

	@PutMapping("/rate-plans/{id}")
	public RatePlan updateRatePlan(@PathVariable UUID id, @RequestBody AdminRatePlanInput in) {
		return rate.updateRatePlan(id, in);
	}

	@PostMapping("/room-type-rate-plans")
	public RoomTypeRatePlanInfoView linkRoomTypeRatePlan(@RequestBody LinkRequest in) {
		return rate.linkRoomTypeRatePlan(in.roomTypeId(), in.ratePlanId());
	}

	@DeleteMapping("/room-type-rate-plans/{linkId}")
	public void unlinkRoomTypeRatePlan(@PathVariable UUID linkId) {
		rate.unlinkRoomTypeRatePlan(linkId);
	}

	@PutMapping("/room-type-rate-plans/{linkId}/prices")
	public List<RatePlanPriceInfoView> setRatePlanPrices(@PathVariable UUID linkId,
			@RequestBody List<RatePlanPriceInput> prices) {
		return rate.setRatePlanPrices(linkId, prices);
	}

	/** Transport-specific body for the link action. */
	public record LinkRequest(UUID roomTypeId, UUID ratePlanId) {
	}

	// ---------------------------------------------------------------- promotions

	@PostMapping("/promotions")
	public ResponseEntity<AdminPromotionView> createPromotion(
			@RequestParam(required = false) UUID hotelId,
			@RequestBody AdminPromotionInput in) {
		return ResponseEntity.status(HttpStatus.CREATED).body(rate.createPromotion(hotelId, in));
	}

	@PutMapping("/promotions/{id}")
	public AdminPromotionView updatePromotion(@PathVariable UUID id,
			@RequestBody AdminPromotionInput in) {
		return rate.updatePromotion(id, in);
	}

	@PutMapping("/promotions/{id}/status")
	public AdminPromotionView setPromotionStatus(@PathVariable UUID id,
			@RequestBody StatusRequest in) {
		return rate.setPromotionStatus(id, in.status());
	}

	/** Transport-specific body for the status action. */
	public record StatusRequest(String status) {
	}
}

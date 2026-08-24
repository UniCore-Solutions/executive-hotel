package com.hotelcollection.hotel.mapper;

import com.hotelcollection.hotel.dto.rate.AdminPromotionView;
import com.hotelcollection.hotel.entity.Promotion;

/** Entity → view mapping helpers shared by the rate module's services. */
public final class RateMapper {

	private RateMapper() {
	}

	public static AdminPromotionView promotionView(Promotion p) {
		return new AdminPromotionView(p.getId(), p.getHotelId(), p.getCode(), p.getName(),
				p.getDescription(), p.getDiscountType() == null ? null : p.getDiscountType().name(),
				p.getDiscountValue(), p.getBookingWindowStart(), p.getBookingWindowEnd(),
				p.getStayWindowStart(), p.getStayWindowEnd(),
				p.getMinNights() == null ? null : p.getMinNights().intValue(),
				p.getMaxUsageTotal(), p.getMaxUsagePerGuest(), p.isStackable(),
				p.isAppliesToAllRoomTypes(), p.isAppliesToAllRatePlans(),
				p.getApplicableDaysOfWeek(), p.getStatus(), p.getCreatedAt());
	}
}
package com.hotelcollection.hotel.dto.rate;
import com.hotelcollection.hotel.entity.Promotion;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Promotion create/update input (back-office). hotelId is separate (createPromotion arg). */
public record AdminPromotionInput(String code, String name, String description,
		String discountType, BigDecimal discountValue, LocalDate bookingWindowStart,
		LocalDate bookingWindowEnd, LocalDate stayWindowStart, LocalDate stayWindowEnd,
		Integer minNights, Long maxUsageTotal, Long maxUsagePerGuest, Boolean stackable,
		Boolean appliesToAllRoomTypes, Boolean appliesToAllRatePlans, String applicableDaysOfWeek,
		String status) {
}

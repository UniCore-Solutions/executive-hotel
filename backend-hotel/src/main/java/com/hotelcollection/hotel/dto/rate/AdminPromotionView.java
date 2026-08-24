package com.hotelcollection.hotel.dto.rate;
import com.hotelcollection.hotel.entity.Promotion;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Promotion with full eligibility fields (back-office). hotelId null = platform-wide. */
public record AdminPromotionView(UUID id, UUID hotelId, String code, String name,
		String description, String discountType, BigDecimal discountValue,
		LocalDate bookingWindowStart, LocalDate bookingWindowEnd, LocalDate stayWindowStart,
		LocalDate stayWindowEnd, Integer minNights, Long maxUsageTotal, Long maxUsagePerGuest,
		boolean stackable, boolean appliesToAllRoomTypes, boolean appliesToAllRatePlans,
		String applicableDaysOfWeek, String status, Instant createdAt) {
}

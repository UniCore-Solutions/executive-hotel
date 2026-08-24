package com.hotelcollection.hotel.util;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import com.hotelcollection.hotel.entity.CancellationPenaltyType;
import com.hotelcollection.hotel.entity.RatePlan;
import com.hotelcollection.hotel.util.CancellationPolicy;

class CancellationPolicyTest {

	private RatePlan plan() {
		RatePlan plan = new RatePlan();
		plan.setRefundable(true);
		plan.setCancellationDeadlineDays((short) 2);
		plan.setCancellationPenaltyType(CancellationPenaltyType.first_night);
		return plan;
	}

	private final BigDecimal subtotal = new BigDecimal("3000.00");
	private final BigDecimal ratePerNight = new BigDecimal("1000.00");

	@Test
	void nonRefundablePlanForfeitsFullSubtotal() {
		RatePlan plan = plan();
		plan.setRefundable(false);
		var result = CancellationPolicy.evaluate(plan, subtotal, ratePerNight,
				LocalDate.now().plusDays(10));
		assertThat(result.isRefundable()).isFalse();
		assertThat(result.penaltyAmount()).isEqualByComparingTo(subtotal);
		assertThat(result.refundAmount()).isZero();
	}

	@Test
	void refundablePlanWithinDeadlineIsFree() {
		// cancellation now, check-in in 10 days, deadline 2 days before check-in
		var result = CancellationPolicy.evaluate(plan(), subtotal, ratePerNight,
				LocalDate.now().plusDays(10));
		assertThat(result.isRefundable()).isTrue();
		assertThat(result.penaltyAmount()).isZero();
		assertThat(result.refundAmount()).isEqualByComparingTo(subtotal);
	}

	@Test
	void refundablePlanAfterDeadlinePaysFirstNight() {
		var result = CancellationPolicy.evaluate(plan(), subtotal, ratePerNight,
				LocalDate.now().plusDays(1));
		assertThat(result.penaltyAmount()).isEqualByComparingTo(ratePerNight);
		assertThat(result.refundAmount()).isEqualByComparingTo(new BigDecimal("2000.00"));
	}

	@Test
	void percentagePenaltyScalesWithSubtotal() {
		RatePlan plan = plan();
		plan.setCancellationPenaltyType(CancellationPenaltyType.percentage);
		plan.setCancellationPenaltyValue(new BigDecimal("25"));
		var result = CancellationPolicy.evaluate(plan, subtotal, ratePerNight,
				LocalDate.now().plusDays(1));
		assertThat(result.penaltyAmount()).isEqualByComparingTo(new BigDecimal("750.00"));
	}

	@Test
	void planWithNoDeadlineIsAlwaysPenalized() {
		RatePlan plan = plan();
		plan.setCancellationDeadlineDays(null);
		var result = CancellationPolicy.evaluate(plan, subtotal, ratePerNight,
				LocalDate.now().plusDays(30));
		assertThat(result.penaltyAmount()).isEqualByComparingTo(ratePerNight);
	}
}
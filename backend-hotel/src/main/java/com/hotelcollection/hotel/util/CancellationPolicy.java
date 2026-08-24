package com.hotelcollection.hotel.util;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.hotelcollection.hotel.entity.CancellationPenaltyType;
import com.hotelcollection.hotel.entity.RatePlan;

/**
 * Cancellation penalty rule, frontend-compatible (cancellation.ts):
 * non-refundable plans (ro) forfeit the full room subtotal; refundable
 * plans with a free-cancellation deadline incur no penalty before the
 * deadline, otherwise the configured penalty applies (first night by
 * default). Documented in docs/architecture/invariants.md.
 */
public final class CancellationPolicy {

	private CancellationPolicy() {
	}

	public record Evaluation(boolean isRefundable, BigDecimal penaltyAmount, BigDecimal refundAmount) {
	}

	public static Evaluation evaluate(RatePlan plan, BigDecimal lineSubtotal, BigDecimal ratePerNight,
			LocalDate checkInDate) {
		boolean isRefundable = plan.isRefundable();
		BigDecimal penalty;
		if (!isRefundable) {
			penalty = lineSubtotal;
		} else if (plan.getCancellationDeadlineDays() != null
				&& LocalDate.now().plusDays(plan.getCancellationDeadlineDays()).isBefore(checkInDate)) {
			penalty = MoneyUtil.ZERO;
		} else {
			penalty = penaltyFor(plan, lineSubtotal, ratePerNight);
		}
		return new Evaluation(isRefundable, penalty, lineSubtotal.subtract(penalty).max(MoneyUtil.ZERO));
	}

	private static BigDecimal penaltyFor(RatePlan plan, BigDecimal lineSubtotal, BigDecimal ratePerNight) {
		CancellationPenaltyType type = plan.getCancellationPenaltyType();
		if (type == null) {
			type = CancellationPenaltyType.first_night;
		}
		return switch (type) {
			case first_night -> ratePerNight;
			case full_stay -> lineSubtotal;
			case percentage -> MoneyUtil.percent(lineSubtotal, plan.getCancellationPenaltyValue());
			case fixed_amount -> plan.getCancellationPenaltyValue() == null
					? MoneyUtil.ZERO
					: plan.getCancellationPenaltyValue().min(lineSubtotal);
		};
	}
}
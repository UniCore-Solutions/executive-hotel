package com.hotelcollection.hotel.util;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import com.hotelcollection.hotel.entity.RatePlan;
import com.hotelcollection.hotel.exception.DomainException;

/**
 * How much of a stay is due at booking, per the rate plan's
 * {@code payment_timing} (chk_rate_plans_payment_timing).
 *
 * <ul>
 *   <li>{@code pay_at_property} — nothing now; the guest settles on arrival.</li>
 *   <li>{@code prepay_full} — the whole total at booking.</li>
 *   <li>{@code prepay_deposit} — {@code deposit_percentage} of the total now,
 *       the balance at the property.</li>
 * </ul>
 *
 * Documented in docs/investigations/ROOM_TYPE_PAYMENT_CONFIG_2026-09-01.md.
 */
public final class PaymentTerms {

	public static final String PAY_AT_PROPERTY = "pay_at_property";
	public static final String PREPAY_FULL = "prepay_full";
	public static final String PREPAY_DEPOSIT = "prepay_deposit";

	public static final Set<String> VALID = Set.of(PAY_AT_PROPERTY, PREPAY_FULL, PREPAY_DEPOSIT);

	private PaymentTerms() {
	}

	/**
	 * The single payment timing governing a booking.
	 *
	 * <p>A reservation can hold several room lines on different rate plans, and
	 * nothing in the schema stops those plans disagreeing about when the stay is
	 * paid. Splitting one booking across "nothing now" and "everything now" is a
	 * product decision nobody has made, so a mixed cart is rejected rather than
	 * silently resolved — see the same investigation, §5.
	 */
	public static String timingOf(List<RatePlan> plans) {
		if (plans.isEmpty()) {
			throw DomainException.validation("at least one rate plan is required");
		}
		String timing = normalize(plans.get(0).getPaymentTiming());
		for (RatePlan plan : plans) {
			if (!timing.equals(normalize(plan.getPaymentTiming()))) {
				throw DomainException.validation(
						"all rooms in one booking must share the same payment terms");
			}
		}
		return timing;
	}

	/** Amount taken at booking; the remainder is due at the property. */
	public static BigDecimal amountDueNow(String paymentTiming, BigDecimal total,
			BigDecimal depositPercentage) {
		return switch (normalize(paymentTiming)) {
			case PAY_AT_PROPERTY -> MoneyUtil.ZERO;
			case PREPAY_DEPOSIT -> depositPercentage == null
					? MoneyUtil.of(total)
					: MoneyUtil.percent(total, depositPercentage);
			default -> MoneyUtil.of(total);
		};
	}

	/**
	 * Unknown or missing values read as {@code prepay_full}. The column is
	 * CHECK-constrained and NOT NULL, so this only fires if the contract drifts —
	 * and charging at booking is the safe reading: the alternative would confirm
	 * a stay the property was never told to collect for.
	 */
	private static String normalize(String paymentTiming) {
		return paymentTiming != null && VALID.contains(paymentTiming) ? paymentTiming : PREPAY_FULL;
	}
}

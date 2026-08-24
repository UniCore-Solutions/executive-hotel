package com.hotelcollection.hotel.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class MoneyUtil {

	private MoneyUtil() {
	}

	public static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

	public static BigDecimal of(BigDecimal value) {
		return value == null ? ZERO : value.setScale(2, RoundingMode.HALF_UP);
	}

	public static BigDecimal of(double value) {
		return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
	}

	public static BigDecimal percent(BigDecimal base, BigDecimal rate) {
		return of(base.multiply(rate).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
	}

	public static BigDecimal multiply(BigDecimal a, long b) {
		return of(a.multiply(BigDecimal.valueOf(b)));
	}
}
package com.hotelcollection.hotel.util;

import com.hotelcollection.hotel.exception.DomainException;

/**
 * Input validation guards used by application services. All failures map
 * to a VALIDATION DomainException (GraphQL code VALIDATION).
 */
public final class Validation {

	private Validation() {
	}

	public static void requireNotBlank(String value, String field) {
		if (value == null || value.isBlank()) {
			throw DomainException.validation(field + " is required");
		}
	}

	public static void requirePositive(int value, String field) {
		if (value <= 0) {
			throw DomainException.validation(field + " must be positive");
		}
	}

	public static void requirePositive(java.math.BigDecimal value, String field) {
		if (value == null || value.signum() <= 0) {
			throw DomainException.validation(field + " must be positive");
		}
	}

	public static void requireEmail(String email) {
		if (email == null || email.isBlank()) {
			return;
		}
		String trimmed = email.trim();
		if (!trimmed.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
			throw DomainException.validation("a valid email address is required");
		}
	}
}
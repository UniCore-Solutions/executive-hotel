package com.hotelcollection.hotel.util;

import java.security.SecureRandom;

/** Opaque guest-facing confirmation references (ADR-005): RC-XXXXXX. */
public final class ReferenceGenerator {

	private static final String CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
	private static final SecureRandom RANDOM = new SecureRandom();

	private ReferenceGenerator() {
	}

	public static String newReference() {
		StringBuilder sb = new StringBuilder("RC-");
		for (int i = 0; i < 6; i++) {
			sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
		}
		return sb.toString();
	}
}
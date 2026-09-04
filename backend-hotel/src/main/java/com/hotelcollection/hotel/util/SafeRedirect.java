package com.hotelcollection.hotel.util;

/**
 * Validates a caller-supplied post-login return path before it is ever
 * persisted or redirected to. Defense in depth for the OAuth
 * {@code redirect} query param — the frontend also validates before sending
 * it, but this endpoint must not trust that.
 */
public final class SafeRedirect {

	private SafeRedirect() {
	}

	/** @return {@code path} if it is a safe internal relative path, else {@code null}. */
	public static String validate(String path) {
		if (path == null || path.isBlank()) {
			return null;
		}
		if (!path.startsWith("/") || path.startsWith("//") || path.contains("\\") || path.contains(":")) {
			return null;
		}
		return path;
	}
}

package com.hotelcollection.hotel.security;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Authenticated actor resolved from a JWT (see ADR-007).
 * {@code hotelIds} are the hotel memberships granted through user_roles;
 * a NULL membership means the role is platform-level.
 */
public record CurrentUser(
		UUID userId,
		String email,
		List<String> roles,
		List<UUID> hotelIds,
		Instant issuedAt) {

	public boolean hasRole(String role) {
		return roles != null && roles.contains(role);
	}

	/** True when the actor may operate within the given hotel scope. */
	public boolean inHotel(UUID hotelId) {
		if (hotelId == null) {
			return false;
		}
		return hasRole("super_admin") || (hotelIds != null && hotelIds.contains(hotelId));
	}
}
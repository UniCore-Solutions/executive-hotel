package com.hotelcollection.hotel.security;

import java.util.List;
import java.util.Optional;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.hotelcollection.hotel.exception.DomainException;

@Component
public class CurrentUserAccessor {

	/**
	 * Hotel-scoped staff roles (ADR-012 taxonomy). Staff members belong to at
	 * least one hotel; {@code super_admin} is platform-level. The identity
	 * module reuses this list for role-scope validation.
	 */
	public static final List<String> STAFF_ROLES = List.of(
			"hotel_admin", "revenue_manager", "reservation_agent",
			"reception_staff", "content_manager", "finance_staff");

	public Optional<CurrentUser> currentUser() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth == null || !(auth.getPrincipal() instanceof CurrentUser user)) {
			return Optional.empty();
		}
		return Optional.of(user);
	}

	public CurrentUser require() {
		return currentUser()
				.orElseThrow(() -> new org.springframework.security.authentication.AuthenticationCredentialsNotFoundException(
						"authentication required"));
	}

	/** Requires an authenticated staff member (any hotel-scoped role or super_admin). */
	public CurrentUser requireStaff() {
		CurrentUser actor = require();
		boolean staff = actor.hasRole("super_admin")
				|| actor.roles().stream().anyMatch(STAFF_ROLES::contains);
		if (!staff) {
			throw DomainException.forbidden("staff role required");
		}
		return actor;
	}
}
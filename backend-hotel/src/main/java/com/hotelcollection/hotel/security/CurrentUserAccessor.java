package com.hotelcollection.hotel.security;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

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

	/**
	 * Requires the caller to be staff <em>at this hotel</em>, or platform-level
	 * {@code super_admin}. This is the platform's core authorization check:
	 * {@code /graphql} is {@code permitAll} at the filter chain (ADR-007), so
	 * admin reads and writes are guarded here, inside the service layer, rather
	 * than declaratively — an IDOR must surface as 403, never as a 200 carrying
	 * another hotel's data.
	 *
	 * <p>Every admin-reachable service method must call this (or
	 * {@link #requireSuperAdmin()} / {@link #requireStaff()}); the
	 * {@code ADMIN_SERVICES_ENFORCE_AUTHORIZATION} ArchUnit rule fails the build
	 * if one does not.
	 */
	public CurrentUser requireHotelAccess(UUID hotelId) {
		CurrentUser actor = require();
		if (!actor.hasRole("super_admin") && !actor.inHotel(hotelId)) {
			throw DomainException.forbidden("no access to this hotel");
		}
		return actor;
	}

	/** Requires platform-level {@code super_admin} (cross-hotel operations). */
	public CurrentUser requireSuperAdmin() {
		CurrentUser actor = require();
		if (!actor.hasRole("super_admin")) {
			throw DomainException.forbidden("super_admin role required");
		}
		return actor;
	}

	/**
	 * Requires {@code hotel_admin} of at least one hotel, or platform-level
	 * {@code super_admin}. For platform-shared resources that no single hotel
	 * owns (e.g. the amenity catalog — any hotel_admin can add to it, and the
	 * addition becomes usable by every other hotel too) but that shouldn't be
	 * writable by every staff role either — narrower than {@link #requireStaff()},
	 * broader than {@link #requireSuperAdmin()}.
	 */
	public CurrentUser requireHotelAdminOrSuperAdmin() {
		CurrentUser actor = require();
		boolean allowed = actor.hasRole("super_admin")
				|| (actor.hasRole("hotel_admin") && actor.hotelIds() != null && !actor.hotelIds().isEmpty());
		if (!allowed) {
			throw DomainException.forbidden("hotel_admin or super_admin role required");
		}
		return actor;
	}
}
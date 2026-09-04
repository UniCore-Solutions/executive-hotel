package com.hotelcollection.hotel.service.impl;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.hotelcollection.hotel.entity.User;
import com.hotelcollection.hotel.entity.UserRole;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.JwtService;

/**
 * Turns a persisted {@link User} (with its {@code userRoles} loaded) into an
 * issued JWT. Shared by every path that hands a caller a working session —
 * password login/registration ({@link AuthServiceImpl}) and external-identity
 * sign-in ({@link ExternalAuthServiceImpl}) — so token issuance has exactly
 * one implementation.
 */
@Component
class AuthTokenIssuer {

	private final JwtService jwtService;

	AuthTokenIssuer(JwtService jwtService) {
		this.jwtService = jwtService;
	}

	String issueToken(User user) {
		return jwtService.issue(currentUserOf(user));
	}

	CurrentUser currentUserOf(User user) {
		List<String> roles = new ArrayList<>();
		List<UUID> hotels = new ArrayList<>();
		for (UserRole ur : user.getUserRoles()) {
			roles.add(ur.getRole().getName());
			if (ur.getHotelId() != null) {
				hotels.add(ur.getHotelId());
			}
		}
		return new CurrentUser(user.getId(), user.getEmail(), roles, hotels, Instant.now());
	}
}

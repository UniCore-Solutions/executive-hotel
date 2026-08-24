package com.hotelcollection.hotel.security;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
	 * Stateless JWT issuance/parsing (ADR-007). Claims: sub=userId, email,
	 * roles, hotels, type=access. Key material comes from {@code JWT_SECRET}.
	 *
	 * <p>The secret is a hard requirement: the app fails to start when it is
	 * missing, shorter than 256 bits, or still set to the historic in-repo
	 * development default — a forgery risk. Generate one with
	 * {@code openssl rand -hex 32} and export it as {@code JWT_SECRET}.
	 */
	@Service
	public class JwtService {

		private static final String KNOWN_DEFAULT =
				"dev-only-secret-change-me-in-production-0123456789abcdef";

		private final SecretKey key;
		private final long ttlMinutes;

		public JwtService(
				@Value("${app.security.jwt-secret}") String secret,
				@Value("${app.security.jwt-ttl-minutes}") long ttlMinutes) {
			if (secret == null || secret.isBlank()
					|| secret.getBytes(java.nio.charset.StandardCharsets.UTF_8).length < 32
					|| KNOWN_DEFAULT.equals(secret)) {
				throw new IllegalStateException(
						"JWT_SECRET is missing or too weak: set a strong secret (>= 32 bytes, "
								+ "e.g. `openssl rand -hex 32`) and export it as JWT_SECRET. "
								+ "The historic development default is rejected for security.");
			}
			this.key = Keys.hmacShaKeyFor(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
			this.ttlMinutes = ttlMinutes;
		}

	public String issue(CurrentUser user) {
		Instant now = Instant.now();
		return Jwts.builder()
				.setSubject(String.valueOf(user.userId()))
				.claim("email", user.email())
				.claim("roles", user.roles())
				.claim("hotels", user.hotelIds() == null ? List.of() : user.hotelIds())
				.claim("type", "access")
				.setIssuedAt(Date.from(now))
				.setExpiration(Date.from(now.plusSeconds(ttlMinutes * 60)))
				.signWith(key)
				.compact();
	}

	public CurrentUser parse(String token) {
		Claims claims = Jwts.parserBuilder()
				.setSigningKey(key)
				.build()
				.parseClaimsJws(token)
				.getBody();
		// only access tokens are accepted (a future refresh flow must not be usable here)
		if (!"access".equals(claims.get("type", String.class))) {
			throw new io.jsonwebtoken.JwtException("token type is not access");
		}
		@SuppressWarnings("unchecked")
		List<String> roles = (List<String>) claims.get("roles", ArrayList.class);
		@SuppressWarnings("unchecked")
		List<?> hotels = (List<?>) claims.get("hotels", ArrayList.class);
		List<UUID> hotelIds = hotels == null ? List.of()
				: hotels.stream().map(n -> UUID.fromString(String.valueOf(n))).toList();
		return new CurrentUser(
				UUID.fromString(claims.getSubject()),
				claims.get("email", String.class),
				roles == null ? List.of() : roles,
				hotelIds,
				claims.getIssuedAt() == null ? null : claims.getIssuedAt().toInstant());
	}
}
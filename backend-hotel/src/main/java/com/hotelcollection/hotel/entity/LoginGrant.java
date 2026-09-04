package com.hotelcollection.hotel.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A short-lived, single-use handoff from the backend's OAuth callback (which
 * must redirect to a fixed backend URL registered with the provider) to the
 * frontend's BFF (which owns the httpOnly session cookie). The backend can't
 * hand the browser a JWT directly at the callback without putting it in a
 * URL, so it mints one of these instead; the frontend immediately exchanges
 * it, server-side, for the real {@code AuthPayload} — see
 * {@code ExternalAuthServiceImpl#completeSession}.
 */
@Entity
@Table(name = "login_grants")
@Getter
@Setter
@NoArgsConstructor
public class LoginGrant {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false)
	private String grantValue;

	@Column(nullable = false)
	private UUID userId;

	private String redirectPath;

	@Column(nullable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant expiresAt;

	private Instant consumedAt;
}

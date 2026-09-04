package com.hotelcollection.hotel.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.hotelcollection.hotel.identity.IdentityProviderType;

/**
 * CSRF/replay guard for one external-auth authorization attempt: the opaque
 * {@code state} sent to the provider, the OIDC {@code nonce} the returned ID
 * token must echo, and the guest-site path to return to on success. Single
 * use ({@link #consumedAt}) and short-lived ({@link #expiresAt}) — see
 * {@code ExternalAuthServiceImpl#handleCallback}.
 */
@Entity
@Table(name = "oauth_states")
@Getter
@Setter
@NoArgsConstructor
public class OAuthState {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false)
	private String state;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private IdentityProviderType provider;

	@Column(nullable = false)
	private String nonce;

	private String redirectPath;

	@Column(nullable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant expiresAt;

	private Instant consumedAt;
}

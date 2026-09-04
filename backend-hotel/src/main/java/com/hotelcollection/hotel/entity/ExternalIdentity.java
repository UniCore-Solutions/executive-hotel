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
 * Links a local {@link User} to an identity asserted by an external provider
 * (Google today; Apple/Microsoft/GitHub later — see {@code identity/}). The
 * {@code (provider, providerSubject)} unique constraint is the sole guarantee
 * that one external identity can never be linked to more than one local user.
 * Deliberately carries no access/refresh tokens — this row exists only to
 * answer "which local user does this external subject map to?".
 */
@Entity
@Table(name = "user_external_identities")
@Getter
@Setter
@NoArgsConstructor
public class ExternalIdentity {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false)
	private UUID userId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private IdentityProviderType provider;

	@Column(nullable = false)
	private String providerSubject;

	@Column(nullable = false)
	private String providerEmail;

	@Column(nullable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;
}

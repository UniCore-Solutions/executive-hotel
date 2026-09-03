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

/**
 * A single one-time code (registration verification, or guest reservation
 * lookup). Only {@link #codeHash} (SHA-256 hex) is ever persisted — the
 * plaintext code exists only in memory between generation and emailing (see
 * {@code OtpServiceImpl}), never logged, never stored.
 *
 * <p>{@link #verifiedAt} being set doubles as this row's id becoming a
 * short-lived "verified" grant handle for the {@code reservation_lookup}
 * purpose — see {@code BookingService#getByReferenceAndEmailVerified}.
 */
@Entity
@Table(name = "otp_codes")
@Getter
@Setter
@NoArgsConstructor
public class OtpCode {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private OtpPurpose purpose;

	@Column(nullable = false)
	private String email;

	@Column(nullable = false)
	private String codeHash;

	private UUID userId;

	private UUID reservationId;

	@Column(nullable = false)
	private Integer attempts = 0;

	@Column(nullable = false)
	private Integer maxAttempts = 5;

	private Instant verifiedAt;

	@Column(nullable = false)
	private Instant expiresAt;

	@Column(nullable = false)
	private Instant createdAt;
}

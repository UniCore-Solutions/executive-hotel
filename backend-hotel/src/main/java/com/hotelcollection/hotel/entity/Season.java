package com.hotelcollection.hotel.entity;

import java.time.Instant;
import java.time.LocalDate;
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
 * A hotel-scoped, named date range (high/low/shoulder/custom season) — a
 * calendar/definition module only. Deliberately not linked to
 * {@link RatePlanPrice} or any pricing logic; overlap among a hotel's
 * active seasons is impossible (C2-style EXCLUDE constraint, gated on
 * is_active — see V42__seasons.sql).
 */
@Entity
@Table(name = "seasons")
@Getter
@Setter
@NoArgsConstructor
public class Season {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "hotel_id", nullable = false)
	private UUID hotelId;

	@Column(nullable = false)
	private String name;

	@Column(name = "season_type", nullable = false)
	private String seasonType;

	@Column(name = "start_date", nullable = false)
	private LocalDate startDate;

	@Column(name = "end_date", nullable = false)
	private LocalDate endDate;

	@Column(name = "is_active", nullable = false)
	private boolean isActive = true;

	private String color;

	private String notes;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;
}

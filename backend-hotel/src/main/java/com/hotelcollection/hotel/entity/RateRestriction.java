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

/** Sparse per-date restriction overrides for an offered pair (C3). */
@Entity
@Table(name = "rate_restrictions")
@Getter
@Setter
@NoArgsConstructor
public class RateRestriction {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "hotel_id", nullable = false)
	private UUID hotelId;

	@Column(name = "room_type_rate_plan_id", nullable = false)
	private UUID roomTypeRatePlanId;

	@Column(name = "stay_date", nullable = false)
	private LocalDate stayDate;

	private Short minStayOverride;

	private Short maxStayOverride;

	@Column(nullable = false)
	private boolean closedToArrival;

	@Column(nullable = false)
	private boolean closedToDeparture;

	@Column(nullable = false)
	private boolean stopSell;

	@Column(nullable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;
}
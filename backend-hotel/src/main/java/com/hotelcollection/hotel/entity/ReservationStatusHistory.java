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

/** Append-only status transition log; from_status NULL on the initial insert. */
@Entity
@Table(name = "reservation_status_history")
@Getter
@Setter
@NoArgsConstructor
public class ReservationStatusHistory {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "reservation_id", nullable = false)
	private UUID reservationId;

	@Enumerated(EnumType.STRING)
	private ReservationStatus fromStatus;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private ReservationStatus toStatus;

	private UUID changedByUserId;

	private String note;

	@Column(nullable = false)
	private Instant changedAt;
}
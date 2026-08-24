package com.hotelcollection.hotel.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "reservation_cancellations")
@Getter
@Setter
@NoArgsConstructor
public class ReservationCancellation {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@OneToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "reservation_id", nullable = false, unique = true)
	@com.fasterxml.jackson.annotation.JsonIgnore
	private Reservation reservation;

	private UUID cancellationReasonId;

	private String reasonNote;

	private UUID cancelledByUserId;

	@Column(nullable = false)
	private boolean isRefundable;

	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal penaltyAmount;

	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal refundAmount;

	@Column(nullable = false)
	private Instant cancelledAt;
}
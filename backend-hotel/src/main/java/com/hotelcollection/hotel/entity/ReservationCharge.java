package com.hotelcollection.hotel.entity;

import java.math.BigDecimal;
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

/** Snapshotted tax/fee line of a reservation. */
@Entity
@Table(name = "reservation_charges")
@Getter
@Setter
@NoArgsConstructor
public class ReservationCharge {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "reservation_id", nullable = false)
	private UUID reservationId;

	private UUID taxFeeTypeId;

	@Column(nullable = false)
	private String chargeType;

	@Column(nullable = false)
	private String name;

	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal amount;

	@Column(nullable = false)
	private Instant createdAt;
}
package com.hotelcollection.hotel.entity;

import java.math.BigDecimal;
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

/** One room line of a reservation; (room_type, rate_plan) must be an offer (C3). */
@Entity
@Table(name = "reservation_rooms")
@Getter
@Setter
@NoArgsConstructor
public class ReservationRoom {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "reservation_id", nullable = false)
	private UUID reservationId;

	@Column(name = "hotel_id", nullable = false)
	private UUID hotelId;

	@Column(name = "room_type_id", nullable = false)
	private UUID roomTypeId;

	@Column(name = "rate_plan_id", nullable = false)
	private UUID ratePlanId;

	private UUID roomId;

	@Column(nullable = false)
	private LocalDate checkInDate;

	@Column(nullable = false)
	private LocalDate checkOutDate;

	@Column(nullable = false)
	private Short nights;

	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal ratePerNight;

	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal subtotalAmount;

	@Column(nullable = false)
	private String status;
}
package com.hotelcollection.hotel.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
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

/** hotel_id NULL = platform-wide promotion (C5/C6). */
@Entity
@Table(name = "promotions")
@Getter
@Setter
@NoArgsConstructor
public class Promotion {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	private UUID hotelId;

	@Column(nullable = false)
	private String code;

	@Column(nullable = false)
	private String name;

	private String description;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private PromotionDiscountType discountType;

	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal discountValue;

	private LocalDate bookingWindowStart;

	private LocalDate bookingWindowEnd;

	private LocalDate stayWindowStart;

	private LocalDate stayWindowEnd;

	private Short minNights;

	private Long maxUsageTotal;

	private Long maxUsagePerGuest;

	@Column(nullable = false)
	private boolean stackable;

	@Column(nullable = false)
	private boolean appliesToAllRoomTypes;

	@Column(nullable = false)
	private boolean appliesToAllRatePlans;

	private String applicableDaysOfWeek;

	@Column(nullable = false)
	private String status;

	@Column(nullable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;
}
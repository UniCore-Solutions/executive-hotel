
package com.hotelcollection.hotel.entity;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;


import java.math.BigDecimal;
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

@Entity
@Table(name = "rate_plans")
@Getter
@Setter
@NoArgsConstructor
public class RatePlan {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "hotel_id", nullable = false)
	private UUID hotelId;

	@Column(nullable = false)
	private String name;

	@Column(nullable = false)
	private String code;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "currency_code", nullable = false)
	private String currencyCode;

	private String mealPlan;

	private String cancellationPolicy;

	private String paymentPolicy;

	@Column(nullable = false)
	private boolean isRefundable;

	private Short cancellationDeadlineDays;

	@Enumerated(EnumType.STRING)
	private CancellationPenaltyType cancellationPenaltyType;

	@Column(precision = 10, scale = 2)
	private BigDecimal cancellationPenaltyValue;

	@Column(nullable = false)
	private String paymentTiming;

	@Column(precision = 5, scale = 2)
	private BigDecimal depositPercentage;

	private Short minStay;

	private Short maxStay;

	private String occupancyRules;

	@Column(nullable = false)
	private String status;

	@Column(nullable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;
}
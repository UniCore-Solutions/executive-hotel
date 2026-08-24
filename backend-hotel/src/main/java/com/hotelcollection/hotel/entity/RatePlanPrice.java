
package com.hotelcollection.hotel.entity;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;


import java.math.BigDecimal;
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
 * Base price by inclusive date range; overlapping ranges are impossible
 * (C2: EXCLUDE constraint, btree_gist).
 */
@Entity
@Table(name = "rate_plan_prices")
@Getter
@Setter
@NoArgsConstructor
public class RatePlanPrice {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "room_type_rate_plan_id", nullable = false)
	private UUID roomTypeRatePlanId;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "currency_code", nullable = false)
	private String currencyCode;

	@Column(name = "valid_from", nullable = false)
	private LocalDate validFrom;

	@Column(name = "valid_to", nullable = false)
	private LocalDate validTo;

	@Column(name = "price_amount", nullable = false, precision = 10, scale = 2)
	private BigDecimal priceAmount;

	@Column(nullable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;
}
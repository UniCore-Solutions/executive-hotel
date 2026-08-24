
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

/** Tax/fee definition; hotel_id NULL = applies platform-wide by default (C6). */
@Entity
@Table(name = "tax_fee_types")
@Getter
@Setter
@NoArgsConstructor
public class TaxFeeType {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	private UUID hotelId;

	@Column(nullable = false)
	private String name;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private TaxFeeChargeType chargeType;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private TaxFeeCalculationMethod calculationMethod;

	@Column(nullable = false, precision = 10, scale = 4)
	private BigDecimal value;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "currency_code")
	private String currencyCode;

	@Column(nullable = false)
	private String status;

	@Column(nullable = false)
	private Instant createdAt;
}
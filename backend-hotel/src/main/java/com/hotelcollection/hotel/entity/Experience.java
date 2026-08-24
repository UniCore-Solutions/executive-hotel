
package com.hotelcollection.hotel.entity;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;


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

@Entity
@Table(name = "experiences")
@Getter
@Setter
@NoArgsConstructor
public class Experience {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "hotel_id", nullable = false)
	private UUID hotelId;

	@Column(nullable = false)
	private String name;

	private String description;

	private String category;

	private Integer durationMinutes;

	private BigDecimal priceAmount;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "currency_code")
	private String currencyCode;

	private String location;

	@Column(nullable = false)
	private String status;

	@Column(name = "is_featured_on_homepage", nullable = false)
	private Boolean isFeaturedOnHomepage = false;

	@Column(nullable = false)
	private Short sortOrder;

	@Column(nullable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;
}
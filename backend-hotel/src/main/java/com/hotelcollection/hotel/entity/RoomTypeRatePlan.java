
package com.hotelcollection.hotel.entity;

import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;


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
 * Offered (room_type, rate_plan) pair, hotel-scoped (C3). Currency is
 * pinned to the rate plan's currency by a composite FK (C8).
 */
@Entity
@Table(name = "room_type_rate_plans")
@Getter
@Setter
@NoArgsConstructor
public class RoomTypeRatePlan {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "hotel_id", nullable = false)
	private UUID hotelId;

	@Column(name = "room_type_id", nullable = false)
	private UUID roomTypeId;

	@Column(name = "rate_plan_id", nullable = false)
	private UUID ratePlanId;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "currency_code", nullable = false)
	private String currencyCode;
}
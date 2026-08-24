
package com.hotelcollection.hotel.entity;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;


import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "currencies")
@Getter
@NoArgsConstructor
public class Currency {

	@Id
	@JdbcTypeCode(SqlTypes.CHAR)
	@Column()
	private String code;

	@Column(nullable = false)
	private String name;

	@Column(name = "decimal_places", nullable = false)
	private Short decimalPlaces;
}
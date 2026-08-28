
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
@Table(name = "countries")
@Getter
@NoArgsConstructor
public class Country {

	@Id
	@JdbcTypeCode(SqlTypes.CHAR)
	@Column()
	private String code;

	@Column(nullable = false)
	private String name;

	/** E.164 calling code without the '+' (e.g. '212' for MA) — V28. */
	@Column(name = "calling_code")
	private String callingCode;
}
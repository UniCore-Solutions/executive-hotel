package com.hotelcollection.hotel.entity;

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

/**
 * Platform = the collection / brand tenant ("The Hotel Collection").
 * Logo/hero/gallery live in media + content blocks, never as platform
 * columns; contact_email/contact_phone (V34) are simple display fields and
 * live here directly, same posture as the hotel's own phone/email.
 */
@Entity
@Table(name = "platforms")
@Getter
@Setter
@NoArgsConstructor
public class Platform {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false)
	private String name;

	@Column(nullable = false)
	private String slug;

	private String tagline;

	private String description;

	@Column(nullable = false)
	private String status;

	@org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.CHAR)
	@Column(name = "default_currency")
	private String defaultCurrency;

	@Column(name = "contact_email")
	private String contactEmail;

	@Column(name = "contact_phone")
	private String contactPhone;

	@Column(nullable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;
}
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
 * Media with typed owner columns (C4 / ADR-006): exactly one of the six
 * owner ids is set; enforced by chk_media_single_owner.
 */
@Entity
@Table(name = "media")
@Getter
@Setter
@NoArgsConstructor
public class Media {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false)
	private String url;

	private String storageKey;

	private String altText;

	private String category;

	private String mimeType;

	private Integer width;

	private Integer height;

	private UUID hotelId;

	private UUID roomTypeId;

	private UUID experienceId;

	private UUID restaurantId;

	private UUID extraId;

	@Column(name = "platform_id")
	private UUID platformId;

	private String caption;

	@Column(nullable = false)
	private boolean isPrimary;

	@Column(nullable = false)
	private Short sortOrder;

	@Column(nullable = false)
	private Instant createdAt;
}
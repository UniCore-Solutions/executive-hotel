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

	/**
	 * Governed category vocabulary for {@link #category}. Deliberately a
	 * constant over a free string, not a DB enum on the column itself
	 * (VARCHAR(50) stays open for a future category without a migration) —
	 * this is the single place other code should reference instead of
	 * repeating the literal. {@code CATEGORY_LOGO} is the only one with a
	 * uniqueness rule enforced (one per hotel/platform owner, see
	 * {@code V39__media_logo_uniqueness.sql}); the others are informational.
	 */
	public static final String CATEGORY_LOGO = "logo";
	public static final String CATEGORY_GALLERY = "gallery";
	public static final String CATEGORY_HERO = "hero";
	public static final String CATEGORY_COVER = "cover";

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
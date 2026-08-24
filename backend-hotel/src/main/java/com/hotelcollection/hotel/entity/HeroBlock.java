package com.hotelcollection.hotel.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** 1:1 typed content block for the index-page hero (platform_content_blocks id). */
@Entity
@Table(name = "hero_blocks")
@Getter
@Setter
@NoArgsConstructor
public class HeroBlock {

	@Id
	@Column(name = "content_block_id")
	private UUID contentBlockId;

	private String eyebrow;

	@Column(nullable = false)
	private String title;

	private String subtitle;

	@Column(name = "image_media_id")
	private UUID imageMediaId;

	@Column(name = "mobile_image_media_id")
	private UUID mobileImageMediaId;

	@Column(name = "cta_label")
	private String ctaLabel;

	@Column(name = "cta_target")
	private String ctaTarget;
}
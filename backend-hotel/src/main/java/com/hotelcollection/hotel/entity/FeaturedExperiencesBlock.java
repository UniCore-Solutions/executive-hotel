package com.hotelcollection.hotel.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** 1:1 typed content block curating a set of experiences (platform_content_blocks id). */
@Entity
@Table(name = "featured_experiences_blocks")
@Getter
@Setter
@NoArgsConstructor
public class FeaturedExperiencesBlock {

	@Id
	@Column(name = "content_block_id")
	private UUID contentBlockId;

	@Column(nullable = false)
	private String title;
}
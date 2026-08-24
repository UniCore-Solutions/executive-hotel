package com.hotelcollection.hotel.entity;

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
 * Ordered curation row of a FeaturedExperiencesBlock. References the REAL
 * experiences row (single source of truth — never duplicated experience data).
 */
@Entity
@Table(name = "featured_experience_items")
@Getter
@Setter
@NoArgsConstructor
public class FeaturedExperienceItem {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "content_block_id", nullable = false)
	private UUID contentBlockId;

	@Column(name = "experience_id", nullable = false)
	private UUID experienceId;

	@Column(nullable = false)
	private int position;
}
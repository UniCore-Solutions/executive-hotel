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
 * Base row of the typed content-block model (see docs/archive/planning/
 * client-platform-index-data-architecture.md §5). Each block has a 1:1 typed
 * child table (hero_blocks / featured_experiences_blocks) keyed by
 * content_block_id.
 */
@Entity
@Table(name = "platform_content_blocks")
@Getter
@Setter
@NoArgsConstructor
public class PlatformContentBlock {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "platform_id", nullable = false)
	private UUID platformId;

	@Column(nullable = false)
	private String type;

	@Column(nullable = false)
	private int position;

	@Column(name = "is_enabled", nullable = false)
	private boolean isEnabled;

	@Column(nullable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;
}
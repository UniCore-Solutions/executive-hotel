package com.hotelcollection.hotel.dto.platform;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Experience;
import com.hotelcollection.hotel.entity.FeaturedExperienceItem;
import com.hotelcollection.hotel.entity.FeaturedExperiencesBlock;
import com.hotelcollection.hotel.entity.HeroBlock;
import com.hotelcollection.hotel.entity.Media;

/**
 * Flat read views of content blocks for GraphQL: base (platform_content_blocks)
 * plus the 1:1 typed child data, fully resolved by the platform service
 * (no N+1). The record simple names match the GraphQL type names (HeroBlock /
 * FeaturedExperiencesBlock / FeaturedExperienceItem) — Spring for GraphQL
 * resolves interface runtime types by class simple name.
 */
public sealed interface ContentBlockView {

	UUID id();

	String type();

	int position();

	boolean isEnabled();

	record HeroBlock(UUID id, String type, int position, boolean isEnabled,
			String eyebrow, String title, String subtitle, Media image, Media mobileImage,
			String ctaLabel, String ctaTarget) implements ContentBlockView {
	}

	record FeaturedExperiencesBlock(UUID id, String type, int position, boolean isEnabled,
			String title, List<FeaturedExperienceItem> items)
			implements ContentBlockView {
	}

	record FeaturedExperienceItem(UUID id, int position, Experience experience) {
	}
}
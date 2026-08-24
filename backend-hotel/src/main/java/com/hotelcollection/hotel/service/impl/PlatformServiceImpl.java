package com.hotelcollection.hotel.service.impl;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.entity.Experience;
import com.hotelcollection.hotel.entity.FeaturedExperiencesBlock;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.entity.Platform;
import com.hotelcollection.hotel.entity.PlatformContentBlock;
import com.hotelcollection.hotel.entity.FeaturedExperienceItem;
import com.hotelcollection.hotel.entity.HeroBlock;
import com.hotelcollection.hotel.dto.platform.ContentBlockView;
import com.hotelcollection.hotel.service.PlatformService;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.repository.FeaturedExperienceItemRepository;
import com.hotelcollection.hotel.repository.FeaturedExperiencesBlockRepository;
import com.hotelcollection.hotel.repository.HeroBlockRepository;
import com.hotelcollection.hotel.service.MediaQueryService;
import com.hotelcollection.hotel.repository.PlatformContentBlockRepository;
import com.hotelcollection.hotel.repository.PlatformRepository;
import com.hotelcollection.hotel.service.CatalogQueryService;

/**
 * Platform read use cases: platform lookup by slug and content-block assembly.
 * All child rows (typed blocks, items, experiences, media) are batch-loaded per
 * request so the GraphQL layer never triggers N+1. Cross-layer data
 * (experiences, media, hotels) is accessed via the service layer.
 */
@Service
public class PlatformServiceImpl implements PlatformService {

	private final PlatformRepository platformRepository;
	private final PlatformContentBlockRepository blockRepository;
	private final HeroBlockRepository heroRepository;
	private final FeaturedExperiencesBlockRepository featuredRepository;
	private final FeaturedExperienceItemRepository itemRepository;
	private final CatalogQueryService catalog;
	private final MediaQueryService media;

	public PlatformServiceImpl(PlatformRepository platformRepository,
			PlatformContentBlockRepository blockRepository, HeroBlockRepository heroRepository,
			FeaturedExperiencesBlockRepository featuredRepository,
			FeaturedExperienceItemRepository itemRepository,
			CatalogQueryService catalog, MediaQueryService media) {
		this.platformRepository = platformRepository;
		this.blockRepository = blockRepository;
		this.heroRepository = heroRepository;
		this.featuredRepository = featuredRepository;
		this.itemRepository = itemRepository;
		this.catalog = catalog;
		this.media = media;
	}

	@Override
	@Transactional(readOnly = true)
	public Platform getPlatform(String slug) {
		return platformRepository.findBySlug(slug)
				.orElseThrow(() -> DomainException.notFound("platform not found"));
	}

	@Override
	@Transactional(readOnly = true)
	public boolean platformExists(UUID id) {
		return platformRepository.existsById(id);
	}

	/** Enabled blocks of a platform, ordered by position, fully resolved. */
	@Override
	@Transactional(readOnly = true)
	public List<ContentBlockView> contentBlocks(UUID platformId) {
		List<PlatformContentBlock> blocks = blockRepository
				.findByPlatformIdOrderByPosition(platformId).stream()
				.filter(PlatformContentBlock::isEnabled)
				.toList();
		if (blocks.isEmpty()) {
			return List.of();
		}
		List<UUID> blockIds = blocks.stream().map(PlatformContentBlock::getId).toList();

		Map<UUID, HeroBlock> heroes = byId(
				heroRepository.findByContentBlockIdIn(blockIds),
				HeroBlock::getContentBlockId);
		Map<UUID, FeaturedExperiencesBlock> featured = byId(
				featuredRepository.findByContentBlockIdIn(blockIds),
				FeaturedExperiencesBlock::getContentBlockId);

		Map<UUID, List<FeaturedExperienceItem>> itemsByBlock = itemRepository
				.findByContentBlockIdInOrderByPosition(blockIds).stream()
				.collect(Collectors.groupingBy(FeaturedExperienceItem::getContentBlockId));
		Map<UUID, Experience> experiences = catalog.experiencesByIds(itemsByBlock.values().stream()
				.flatMap(Collection::stream)
				.map(FeaturedExperienceItem::getExperienceId)
				.distinct()
				.toList());

		Map<UUID, Media> mediaById = byId(media.findByIds(heroes.values().stream()
				.flatMap(h -> Stream.of(h.getImageMediaId(), h.getMobileImageMediaId()))
				.filter(Objects::nonNull)
				.distinct()
				.toList()), Media::getId);

		List<ContentBlockView> views = new ArrayList<>(blocks.size());
		for (PlatformContentBlock block : blocks) {
			switch (block.getType()) {
				case "HERO" -> {
					HeroBlock hero = heroes.get(block.getId());
					if (hero != null) {
						views.add(new ContentBlockView.HeroBlock(block.getId(), block.getType(),
								block.getPosition(), block.isEnabled(), hero.getEyebrow(),
								hero.getTitle(), hero.getSubtitle(),
								hero.getImageMediaId() == null ? null
										: mediaById.get(hero.getImageMediaId()),
								hero.getMobileImageMediaId() == null ? null
										: mediaById.get(hero.getMobileImageMediaId()),
								hero.getCtaLabel(), hero.getCtaTarget()));
					}
				}
				case "EXPERIENCES" -> {
					FeaturedExperiencesBlock feat = featured.get(block.getId());
					if (feat != null) {
						List<ContentBlockView.FeaturedExperienceItem> items = itemsByBlock
								.getOrDefault(block.getId(), List.of()).stream()
								.map(item -> {
									Experience experience = experiences.get(item.getExperienceId());
									return experience == null ? null
											: new ContentBlockView.FeaturedExperienceItem(item.getId(),
													item.getPosition(), experience);
								})
								.filter(Objects::nonNull)
								.toList();
						views.add(new ContentBlockView.FeaturedExperiencesBlock(block.getId(),
								block.getType(), block.getPosition(), block.isEnabled(),
								feat.getTitle(), items));
					}
				}
				default -> {
					// closed enum; unknown types are skipped defensively
				}
			}
		}
		return views;
	}

	@Override
	@Transactional(readOnly = true)
	public List<Media> mediaByPlatformId(UUID platformId) {
		return media.findByPlatformId(platformId);
	}

	@Override
	@Transactional(readOnly = true)
	public List<Hotel> hotelsByPlatformId(UUID platformId) {
		return catalog.hotelsByPlatformId(platformId);
	}

	private static <T> Map<UUID, T> byId(Collection<T> rows, Function<T, UUID> idExtractor) {
		return rows.stream().collect(Collectors.toMap(idExtractor, Function.identity()));
	}
}
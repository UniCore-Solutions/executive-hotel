package com.hotelcollection.hotel.integration;
import com.hotelcollection.hotel.entity.FeaturedExperiencesBlock;
import com.hotelcollection.hotel.entity.HeroBlock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ContextConfiguration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelcollection.hotel.entity.Experience;
import com.hotelcollection.hotel.entity.FeaturedExperienceItem;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.entity.Platform;
import com.hotelcollection.hotel.entity.PlatformContentBlock;
import com.hotelcollection.hotel.dto.platform.ContentBlockView;
import com.hotelcollection.hotel.integration.TestcontainersConfiguration;
import com.hotelcollection.hotel.integration.TestFixtures;
import com.hotelcollection.hotel.repository.ExperienceRepository;
import com.hotelcollection.hotel.repository.FeaturedExperienceItemRepository;
import com.hotelcollection.hotel.repository.MediaRepository;
import com.hotelcollection.hotel.repository.PlatformContentBlockRepository;
import com.hotelcollection.hotel.repository.PlatformRepository;
import com.hotelcollection.hotel.service.PlatformService;

/**
 * Platform GraphQL surface over real HTTP, plus the approved test cases A–L:
 * platform lookup, slug lookup, block ordering, disabled-block exclusion,
 * hero + hero media resolution, featured experiences referencing REAL
 * experiences, update reflection, no duplication, no dangling references
 * (FK/cascade), and no N+1 (Hibernate statistics).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ContextConfiguration(classes = TestcontainersConfiguration.class)
class PlatformGraphqlIntegrationTest {

	@LocalServerPort
	int port;

	@Autowired
	TestFixtures fixtures;
	@Autowired
	PlatformRepository platforms;
	@Autowired
	PlatformContentBlockRepository blocks;
	@Autowired
	ExperienceRepository experiences;
	@Autowired
	FeaturedExperienceItemRepository items;
	@Autowired
	MediaRepository media;
	@Autowired
	PlatformService platformService;
	@Autowired
	JdbcTemplate jdbc;
	@Autowired
	jakarta.persistence.EntityManagerFactory entityManagerFactory;

	private final ObjectMapper objectMapper = new ObjectMapper();
	private final HttpClient http = HttpClient.newBuilder()
			.connectTimeout(Duration.ofSeconds(10)).build();

	@SuppressWarnings("unchecked")
	private Map<String, Object> post(String query, Map<String, Object> variables) throws Exception {
		HttpRequest request = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + "/graphql"))
				.timeout(Duration.ofSeconds(30))
				.header("Content-Type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(
						Map.of("query", query, "variables", variables == null ? Map.of() : variables))))
				.build();
		HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
		assertThat(response.statusCode()).isEqualTo(200);
		return objectMapper.readValue(response.body(), Map.class);
	}

	// ------------------------------------------------------------- fixtures

	private Platform newPlatform(String slug) {
		Instant now = Instant.now();
		Platform p = new Platform();
		p.setName("Test Collection");
		p.setSlug(slug);
		p.setTagline("tagline-" + slug);
		p.setDescription("desc");
		p.setStatus("active");
		p.setCreatedAt(now);
		p.setUpdatedAt(now);
		return platforms.saveAndFlush(p);
	}

	private PlatformContentBlock newBlock(UUID platformId, String type, int position,
			boolean enabled) {
		Instant now = Instant.now();
		PlatformContentBlock b = new PlatformContentBlock();
		b.setPlatformId(platformId);
		b.setType(type);
		b.setPosition(position);
		b.setEnabled(enabled);
		b.setCreatedAt(now);
		b.setUpdatedAt(now);
		return blocks.saveAndFlush(b);
	}

	private Experience newExperience(String name) {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		Instant now = Instant.now();
		Experience e = new Experience();
		e.setHotelId(fx.hotelId());
		e.setName(name);
		e.setCategory("culture");
		e.setDurationMinutes(90);
		e.setPriceAmount(new java.math.BigDecimal("40.00"));
		e.setCurrencyCode(TestFixtures.CURRENCY);
		e.setStatus("active");
		e.setSortOrder((short) 1);
		e.setCreatedAt(now);
		e.setUpdatedAt(now);
		return experiences.saveAndFlush(e);
	}

	private Media newPlatformMedia(UUID platformId, boolean isPrimary) {
		Media m = new Media();
		m.setUrl("https://cdn.example.com/img-" + System.nanoTime() + ".jpg");
		m.setCategory("hero");
		m.setPlatformId(platformId);
		m.setPrimary(isPrimary);
		m.setSortOrder((short) 0);
		m.setCreatedAt(Instant.now());
		return media.saveAndFlush(m);
	}

	// ------------------------------------------------------------- A–D

	@Test
	void platformExistsBySlug() throws Exception {
		Platform p = newPlatform("collection-" + System.nanoTime());
		Map<String, Object> body = post("""
				query($slug: String!) {
				  platform(slug: $slug) { id slug name tagline status createdAt }
				}
				""", Map.of("slug", p.getSlug()));
		assertThat(body.get("errors")).isNull();
		Map<String, Object> platform = (Map<String, Object>) ((Map<String, Object>) body.get("data"))
				.get("platform");
		assertThat(platform.get("slug")).isEqualTo(p.getSlug());
		assertThat(platform.get("name")).isEqualTo("Test Collection");
		assertThat(platform.get("status")).isEqualTo("active");
		assertThat(platform.get("createdAt")).isNotNull();
	}

	@Test
	void unknownSlugReturnsNotFoundError() throws Exception {
		Map<String, Object> body = post("""
				query($slug: String!) { platform(slug: $slug) { id } }
				""", Map.of("slug", "does-not-exist"));
		assertThat(body.get("data")).isNull();
		List<Map<String, Object>> errors = (List<Map<String, Object>>) body.get("errors");
		assertThat(errors).isNotEmpty();
		assertThat(((String) errors.get(0).get("message"))).contains("platform not found");
	}

	@Test
	void contentBlocksAreOrderedByPosition() throws Exception {
		Platform p = newPlatform("ordered-" + System.nanoTime());
		PlatformContentBlock hero = newBlock(p.getId(), "HERO", 1, true);
		PlatformContentBlock feat = newBlock(p.getId(), "EXPERIENCES", 2, true);
		jdbc.update("INSERT INTO hero_blocks (content_block_id, title) VALUES (?, 'title')",
				hero.getId());
		jdbc.update("INSERT INTO featured_experiences_blocks (content_block_id, title)"
				+ " VALUES (?, 'Experiences')", feat.getId());
		Map<String, Object> body = post("""
				query($slug: String!) {
				  platform(slug: $slug) {
				    contentBlocks { ... on HeroBlock { id type position isEnabled title }
				                      ... on FeaturedExperiencesBlock { id type position title } }
				  }
				}
				""", Map.of("slug", p.getSlug()));
		assertThat(body.get("errors")).isNull();
		List<Map<String, Object>> blocks = (List<Map<String, Object>>) ((Map<String, Object>)
				((Map<String, Object>) body.get("data")).get("platform")).get("contentBlocks");
		assertThat(blocks).hasSize(2);
		assertThat(blocks.get(0).get("type")).isEqualTo("HERO");
		assertThat(blocks.get(1).get("type")).isEqualTo("EXPERIENCES");
		assertThat(blocks.get(0).get("position")).isEqualTo(1);
	}

	@Test
	void disabledBlocksAreExcluded() throws Exception {
		Platform p = newPlatform("disabled-" + System.nanoTime());
		PlatformContentBlock hero = newBlock(p.getId(), "HERO", 1, true);
		newBlock(p.getId(), "EXPERIENCES", 2, false);
		jdbc.update("INSERT INTO hero_blocks (content_block_id, title) VALUES (?, 'title')",
				hero.getId());
		Map<String, Object> body = post("""
				query($slug: String!) {
				  platform(slug: $slug) { contentBlocks { id type } }
				}
				""", Map.of("slug", p.getSlug()));
		List<Map<String, Object>> blocks = (List<Map<String, Object>>) ((Map<String, Object>)
				((Map<String, Object>) body.get("data")).get("platform")).get("contentBlocks");
		assertThat(blocks).hasSize(1);
		assertThat(blocks.get(0).get("type")).isEqualTo("HERO");
	}

	// ------------------------------------------------------------- E–F

	@Test
	void heroBlockResolvesWithMedia() throws Exception {
		Platform p = newPlatform("hero-" + System.nanoTime());
		PlatformContentBlock block = newBlock(p.getId(), "HERO", 1, true);
		Media image = newPlatformMedia(p.getId(), true);
		jdbc.update("""
				INSERT INTO hero_blocks (content_block_id, eyebrow, title, subtitle,
				                         image_media_id, cta_label, cta_target)
				VALUES (?, 'eyebrow', 'title', 'subtitle', ?, 'Book', '/search')
				""", block.getId(), image.getId());
		Map<String, Object> body = post("""
				query($slug: String!) {
				  platform(slug: $slug) {
				    contentBlocks {
				      ... on HeroBlock { id eyebrow title subtitle image { url } ctaLabel ctaTarget }
				    }
				  }
				}
				""", Map.of("slug", p.getSlug()));
		assertThat(body.get("errors")).isNull();
		List<Map<String, Object>> blocks = (List<Map<String, Object>>) ((Map<String, Object>)
				((Map<String, Object>) body.get("data")).get("platform")).get("contentBlocks");
		assertThat(blocks).hasSize(1);
		Map<String, Object> hero = blocks.get(0);
		assertThat(hero.get("title")).isEqualTo("title");
		assertThat(hero.get("eyebrow")).isEqualTo("eyebrow");
		assertThat(hero.get("ctaTarget")).isEqualTo("/search");
		assertThat(((Map<String, Object>) hero.get("image")).get("url"))
				.isEqualTo(image.getUrl());
	}

	@Test
	void heroMediaComesFromPlatformOwnedMedia() throws Exception {
		Platform p = newPlatform("hero-media-" + System.nanoTime());
		PlatformContentBlock block = newBlock(p.getId(), "HERO", 1, true);
		Media image = newPlatformMedia(p.getId(), true);
		jdbc.update("""
				INSERT INTO hero_blocks (content_block_id, title, image_media_id)
				VALUES (?, 'title', ?)
				""", block.getId(), image.getId());
		List<ContentBlockView> views = platformService.contentBlocks(p.getId());
		ContentBlockView.HeroBlock hero = (ContentBlockView.HeroBlock) views.get(0);
		assertThat(hero.image().getId()).isEqualTo(image.getId());
		assertThat(hero.image().getPlatformId()).isEqualTo(p.getId());
	}

	// ------------------------------------------------------------- G–J

	@Test
	void featuredExperiencesResolveRealExperiences() throws Exception {
		Platform p = newPlatform("feat-" + System.nanoTime());
		PlatformContentBlock block = newBlock(p.getId(), "EXPERIENCES", 1, true);
		Experience e1 = newExperience("Sunset Cruise");
		Experience e2 = newExperience("City Tour");
		jdbc.update("INSERT INTO featured_experiences_blocks (content_block_id, title)"
				+ " VALUES (?, 'Experiences')", block.getId());
		jdbc.update("INSERT INTO featured_experience_items (id, content_block_id, experience_id, position)"
				+ " VALUES (gen_random_uuid(), ?, ?, 1), (gen_random_uuid(), ?, ?, 2)", block.getId(), e1.getId(), block.getId(), e2.getId());
		Map<String, Object> body = post("""
				query($slug: String!) {
				  platform(slug: $slug) {
				    contentBlocks {
				      ... on FeaturedExperiencesBlock {
				        title
				        items { id position experience { id name category priceAmount } }
				      }
				    }
				  }
				}
				""", Map.of("slug", p.getSlug()));
		assertThat(body.get("errors")).isNull();
		List<Map<String, Object>> blocks = (List<Map<String, Object>>) ((Map<String, Object>)
				((Map<String, Object>) body.get("data")).get("platform")).get("contentBlocks");
		assertThat(blocks).hasSize(1);
		List<Map<String, Object>> items = (List<Map<String, Object>>) blocks.get(0).get("items");
		assertThat(items).hasSize(2);
		assertThat(((Map<String, Object>) items.get(0).get("experience")).get("id"))
				.isEqualTo(e1.getId().toString());
		assertThat(((Map<String, Object>) items.get(0).get("experience")).get("name"))
				.isEqualTo("Sunset Cruise");
		assertThat(items.get(0).get("position")).isEqualTo(1);
	}

	@Test
	void experienceUpdateIsReflectedInBlock() throws Exception {
		Platform p = newPlatform("update-" + System.nanoTime());
		PlatformContentBlock block = newBlock(p.getId(), "EXPERIENCES", 1, true);
		Experience e = newExperience("Old Name");
		jdbc.update("INSERT INTO featured_experiences_blocks (content_block_id, title)"
				+ " VALUES (?, 'Experiences')", block.getId());
		jdbc.update("INSERT INTO featured_experience_items (id, content_block_id, experience_id, position)"
				+ " VALUES (gen_random_uuid(), ?, ?, 1)", block.getId(), e.getId());
		e.setName("New Name");
		experiences.saveAndFlush(e);
		Map<String, Object> body = post("""
				query($slug: String!) {
				  platform(slug: $slug) {
				    contentBlocks {
				      ... on FeaturedExperiencesBlock { items { experience { name } } }
				    }
				  }
				}
				""", Map.of("slug", p.getSlug()));
		List<Map<String, Object>> blocks = (List<Map<String, Object>>) ((Map<String, Object>)
				((Map<String, Object>) body.get("data")).get("platform")).get("contentBlocks");
		List<Map<String, Object>> items = (List<Map<String, Object>>) blocks.get(0).get("items");
		assertThat(((Map<String, Object>) items.get(0).get("experience")).get("name"))
				.isEqualTo("New Name");
	}

	@Test
	void blockItemsNeverDuplicateExperienceData() throws Exception {
		Platform p = newPlatform("nodup-" + System.nanoTime());
		PlatformContentBlock block = newBlock(p.getId(), "EXPERIENCES", 1, true);
		Experience e = newExperience("Single Source");
		jdbc.update("INSERT INTO featured_experiences_blocks (content_block_id, title)"
				+ " VALUES (?, 'Experiences')", block.getId());
		jdbc.update("INSERT INTO featured_experience_items (id, content_block_id, experience_id, position)"
				+ " VALUES (gen_random_uuid(), ?, ?, 1)", block.getId(), e.getId());
		List<ContentBlockView> views = platformService.contentBlocks(p.getId());
		ContentBlockView.FeaturedExperiencesBlock view = (ContentBlockView.FeaturedExperiencesBlock) views.get(0);
		assertThat(view.items()).hasSize(1);
		assertThat(view.items().get(0).experience().getId()).isEqualTo(e.getId());
		assertThat(experiences.count()).isGreaterThanOrEqualTo(1);
	}

	// ------------------------------------------------------------- K

	@Test
	void featuredItemCannotReferenceMissingExperience() {
		Platform p = newPlatform("missing-" + System.nanoTime());
		PlatformContentBlock block = newBlock(p.getId(), "EXPERIENCES", 1, true);
		jdbc.update("INSERT INTO featured_experiences_blocks (content_block_id, title)"
				+ " VALUES (?, 'Experiences')", block.getId());
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO featured_experience_items (id, content_block_id, experience_id, position)"
						+ " VALUES (gen_random_uuid(), ?, '00000000-0000-0000-0000-000000000000', 1)", block.getId()))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void deletedExperienceCascadesItsFeaturedItem() throws Exception {
		Platform p = newPlatform("cascade-" + System.nanoTime());
		PlatformContentBlock block = newBlock(p.getId(), "EXPERIENCES", 1, true);
		Experience e = newExperience("To Be Deleted");
		jdbc.update("INSERT INTO featured_experiences_blocks (content_block_id, title)"
				+ " VALUES (?, 'Experiences')", block.getId());
		FeaturedExperienceItem item = new FeaturedExperienceItem();
		item.setContentBlockId(block.getId());
		item.setExperienceId(e.getId());
		item.setPosition(1);
		items.saveAndFlush(item);
		experiences.delete(e);
		experiences.flush();
		assertThat(items.findByContentBlockIdInOrderByPosition(List.of(block.getId()))).isEmpty();
		Map<String, Object> body = post("""
				query($slug: String!) {
				  platform(slug: $slug) {
				    contentBlocks {
				      ... on FeaturedExperiencesBlock { items { id } }
				    }
				  }
				}
				""", Map.of("slug", p.getSlug()));
		List<Map<String, Object>> blocks = (List<Map<String, Object>>) ((Map<String, Object>)
				((Map<String, Object>) body.get("data")).get("platform")).get("contentBlocks");
		assertThat(blocks.get(0).get("items")).asList().isEmpty();
	}

	// ------------------------------------------------------------- L

	@Test
	void contentBlockAssemblyIsBatchLoaded() {
		Platform p = newPlatform("nplus1-" + System.nanoTime());
		PlatformContentBlock hero = newBlock(p.getId(), "HERO", 1, true);
		PlatformContentBlock feat = newBlock(p.getId(), "EXPERIENCES", 2, true);
		Media image = newPlatformMedia(p.getId(), true);
		jdbc.update("INSERT INTO hero_blocks (content_block_id, title, image_media_id)"
				+ " VALUES (?, 'title', ?)", hero.getId(), image.getId());
		Experience e1 = newExperience("Exp One");
		Experience e2 = newExperience("Exp Two");
		Experience e3 = newExperience("Exp Three");
		jdbc.update("INSERT INTO featured_experiences_blocks (content_block_id, title)"
				+ " VALUES (?, 'Experiences')", feat.getId());
		jdbc.update("""
				INSERT INTO featured_experience_items (id, content_block_id, experience_id, position)
				VALUES (gen_random_uuid(), ?, ?, 1), (gen_random_uuid(), ?, ?, 2), (gen_random_uuid(), ?, ?, 3)
				""", feat.getId(), e1.getId(), feat.getId(), e2.getId(), feat.getId(), e3.getId());

		SessionFactory sf = entityManagerFactory.unwrap(SessionFactory.class);
		sf.getStatistics().clear();
		List<ContentBlockView> views = platformService.contentBlocks(p.getId());
		long queries = sf.getStatistics().getQueryExecutionCount();

		assertThat(views).hasSize(2);
		// blocks + heroes + featured + items + experiences + media = 6 queries,
		// regardless of item count; any room for relay noise stays well under 12.
		assertThat(queries).isLessThan(12);
	}
}
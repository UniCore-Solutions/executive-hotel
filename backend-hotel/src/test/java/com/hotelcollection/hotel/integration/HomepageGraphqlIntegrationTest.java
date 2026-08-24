package com.hotelcollection.hotel.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ContextConfiguration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelcollection.hotel.entity.Experience;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.entity.Review;
import com.hotelcollection.hotel.entity.ReviewModerationStatus;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.repository.ExperienceRepository;
import com.hotelcollection.hotel.repository.HotelRepository;
import com.hotelcollection.hotel.repository.MediaRepository;
import com.hotelcollection.hotel.repository.ReviewRepository;
import com.hotelcollection.hotel.repository.RoomTypeRepository;

/**
 * Homepage + room type detail GraphQL surface over real HTTP: curated
 * sections only ever expose flagged AND active/approved rows, draft and
 * pending content never leaks to the guest frontend, and the roomType(id)
 * query enforces the same visibility rules.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ContextConfiguration(classes = TestcontainersConfiguration.class)
class HomepageGraphqlIntegrationTest {

	@LocalServerPort
	int port;

	@Autowired
	TestFixtures fixtures;
	@Autowired
	HotelRepository hotels;
	@Autowired
	RoomTypeRepository roomTypes;
	@Autowired
	ExperienceRepository experiences;
	@Autowired
	ReviewRepository reviews;
	@Autowired
	MediaRepository media;

	private final ObjectMapper objectMapper = new ObjectMapper();
	private final HttpClient http = HttpClient.newBuilder()
			.connectTimeout(Duration.ofSeconds(10)).build();

	@SuppressWarnings("unchecked")
	private Map<String, Object> post(String query) throws Exception {
		HttpRequest request = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + "/graphql"))
				.timeout(Duration.ofSeconds(30))
				.header("Content-Type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(
						Map.of("query", query))))
				.build();
		HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
		assertThat(response.statusCode()).isEqualTo(200);
		return objectMapper.readValue(response.body(), Map.class);
	}

	private Map<String, Object> data(Map<String, Object> body) {
		assertThat(body.get("errors")).as("graphql errors: %s", body.get("errors")).isNull();
		return (Map<String, Object>) body.get("data");
	}

	private Hotel newHotel(String name, String slug, String status, boolean featured) {
		Hotel h = new Hotel();
		h.setName(name);
		h.setSlug(slug);
		h.setBrand("The Hotel Collection");
		h.setDescription("Test hotel " + name);
		h.setCity("Marrakech");
		h.setCountryCode("MA");
		h.setDefaultCurrency(TestFixtures.CURRENCY);
		h.setStatus(status);
		h.setIsFeaturedOnHomepage(featured);
		h.setCreatedAt(Instant.now());
		h.setUpdatedAt(Instant.now());
		return hotels.saveAndFlush(h);
	}

	private RoomType newRoomType(UUID hotelId, String name, String status, boolean featured) {
		RoomType rt = new RoomType();
		rt.setHotelId(hotelId);
		rt.setName(name);
		rt.setMaxAdults((short) 2);
		rt.setMaxChildren((short) 0);
		rt.setStatus(status);
		rt.setIsFeaturedOnHomepage(featured);
		rt.setCreatedAt(Instant.now());
		rt.setUpdatedAt(Instant.now());
		return roomTypes.saveAndFlush(rt);
	}

	private Experience newExperience(UUID hotelId, String name, String status, boolean featured) {
		Experience e = new Experience();
		e.setHotelId(hotelId);
		e.setName(name);
		e.setCategory("culture");
		e.setStatus(status);
		e.setSortOrder((short) 1);
		e.setIsFeaturedOnHomepage(featured);
		e.setCreatedAt(Instant.now());
		e.setUpdatedAt(Instant.now());
		return experiences.saveAndFlush(e);
	}

	private Review newReview(UUID hotelId, String author, ReviewModerationStatus status,
			boolean featured) {
		Review r = new Review();
		r.setHotelId(hotelId);
		r.setAuthorName(author);
		r.setRating((short) 5);
		r.setTitle("title " + author);
		r.setComment("comment " + author);
		r.setModerationStatus(status);
		r.setIsFeaturedOnHomepage(featured);
		r.setCreatedAt(Instant.now());
		r.setUpdatedAt(Instant.now());
		return reviews.saveAndFlush(r);
	}

	private void addMedia(UUID hotelId, UUID roomTypeId) {
		Media m = new Media();
		m.setUrl("https://cdn.example.com/img-" + System.nanoTime() + ".jpg");
		m.setCategory(hotelId != null ? "general" : "rooms");
		m.setHotelId(hotelId);
		m.setRoomTypeId(roomTypeId);
		m.setPrimary(true);
		m.setSortOrder((short) 0);
		m.setCreatedAt(Instant.now());
		media.saveAndFlush(m);
	}

	// ------------------------------------------------------------- sections

	@Test
	void featuredHotelsIncludeOnlyActiveFlaggedHotels() throws Exception {
		TestFixtures.HotelFixture bookable = fixtures.newBookableHotel();
		bookable.hotel().setIsFeaturedOnHomepage(true);
		bookable.roomType().setIsFeaturedOnHomepage(true);
		hotels.saveAndFlush(bookable.hotel());
		roomTypes.saveAndFlush(bookable.roomType());
		addMedia(bookable.hotelId(), null);

		Hotel activeNotFeatured = newHotel("Active Quiet", "quiet-" + System.nanoTime(), "active", false);
		newHotel("Draft Featured", "draft-" + System.nanoTime(), "draft", true);
		newRoomType(activeNotFeatured.getId(), "Unfeatured Room", "active", false);

		Map<String, Object> body = post("""
				{
				  homepage {
				    featuredHotels { id name city status averageRating fromPricePerNight media { url } }
				  }
				}
				""");
		List<Map<String, Object>> result = (List<Map<String, Object>>)
				((Map<String, Object>) data(body).get("homepage")).get("featuredHotels");
		assertThat(result).extracting(h -> h.get("name"))
				.contains(bookable.hotel().getName())
				.doesNotContain("Active Quiet", "Draft Featured");
		assertThat(result).allSatisfy(h -> assertThat(h.get("status")).isEqualTo("active"));
		Map<String, Object> featured = result.stream()
				.filter(h -> bookable.hotel().getName().equals(h.get("name"))).findFirst().orElseThrow();
		assertThat(featured.get("id")).isEqualTo(bookable.hotelId().toString());
		assertThat(featured.get("fromPricePerNight")).isEqualTo(TestFixtures.RATE.intValue());
		assertThat(((List<?>) featured.get("media"))).hasSize(1);
	}

	@Test
	void featuredRoomTypesIncludeOnlyActiveFlaggedRoomTypes() throws Exception {
		TestFixtures.HotelFixture bookable = fixtures.newBookableHotel();
		bookable.hotel().setIsFeaturedOnHomepage(true);
		bookable.roomType().setIsFeaturedOnHomepage(true);
		hotels.saveAndFlush(bookable.hotel());
		roomTypes.saveAndFlush(bookable.roomType());
		addMedia(null, bookable.roomType().getId());

		newRoomType(bookable.hotelId(), "Quiet Room", "active", false);
		newRoomType(bookable.hotelId(), "Draft Featured Room", "draft", true);

		Map<String, Object> body = post("""
				{
				  homepage {
				    featuredRoomTypes { id name hotelId status pricePerNight media { url } }
				  }
				}
				""");
		List<Map<String, Object>> result = (List<Map<String, Object>>)
				((Map<String, Object>) data(body).get("homepage")).get("featuredRoomTypes");
		assertThat(result).extracting(rt -> rt.get("name"))
				.contains("Deluxe Room")
				.doesNotContain("Quiet Room", "Draft Featured Room");
		assertThat(result).allSatisfy(rt -> assertThat(rt.get("status")).isEqualTo("active"));
		Map<String, Object> featured = result.stream()
				.filter(rt -> "Deluxe Room".equals(rt.get("name"))).findFirst().orElseThrow();
		assertThat(featured.get("id")).isEqualTo(bookable.roomType().getId().toString());
		assertThat(featured.get("hotelId")).isEqualTo(bookable.hotelId().toString());
		assertThat(featured.get("pricePerNight")).isEqualTo(TestFixtures.RATE.intValue());
		assertThat(((List<?>) featured.get("media"))).hasSize(1);
	}

	@Test
	void featuredExperiencesIncludeOnlyActiveFlaggedExperiences() throws Exception {
		TestFixtures.HotelFixture bookable = fixtures.newBookableHotel();
		newExperience(bookable.hotelId(), "Featured Tour", "active", true);
		newExperience(bookable.hotelId(), "Quiet Tour", "active", false);
		newExperience(bookable.hotelId(), "Inactive Featured Tour", "inactive", true);

		Map<String, Object> body = post("""
				{
				  homepage {
				    featuredExperiences { id hotelId name }
				  }
				}
				""");
		List<Map<String, Object>> result = (List<Map<String, Object>>)
				((Map<String, Object>) data(body).get("homepage")).get("featuredExperiences");
		assertThat(result).extracting(e -> e.get("name"))
				.contains("Featured Tour")
				.doesNotContain("Quiet Tour", "Inactive Featured Tour");
	}

	@Test
	void featuredReviewsIncludeOnlyApprovedFlaggedReviews() throws Exception {
		TestFixtures.HotelFixture bookable = fixtures.newBookableHotel();
		newReview(bookable.hotelId(), "Approved Featured", ReviewModerationStatus.approved, true);
		newReview(bookable.hotelId(), "Approved Quiet", ReviewModerationStatus.approved, false);
		newReview(bookable.hotelId(), "Pending Quiet", ReviewModerationStatus.pending, false);
		newReview(bookable.hotelId(), "Rejected Quiet", ReviewModerationStatus.rejected, false);

		Map<String, Object> body = post("""
				{
				  homepage {
				    featuredReviews { id hotelId authorName rating title moderationStatus }
				  }
				}
				""");
		List<Map<String, Object>> result = (List<Map<String, Object>>)
				((Map<String, Object>) data(body).get("homepage")).get("featuredReviews");
		assertThat(result).extracting(r -> r.get("authorName"))
				.contains("Approved Featured")
				.doesNotContain("Approved Quiet", "Pending Quiet", "Rejected Quiet");
		assertThat(result).allSatisfy(r -> {
			assertThat(r.get("moderationStatus")).isEqualTo("approved");
			assertThat(r.get("rating")).isEqualTo(5);
		});
	}

	@Test
	void homepageQueryAlwaysReturnsAllSections() throws Exception {
		Map<String, Object> body = post("""
				{
				  homepage {
				    featuredHotels { id } featuredRoomTypes { id }
				    featuredExperiences { id } featuredReviews { id }
				  }
				}
				""");
		Map<String, Object> homepage = (Map<String, Object>) data(body).get("homepage");
		assertThat(homepage.get("featuredHotels")).isNotNull();
		assertThat(homepage.get("featuredRoomTypes")).isNotNull();
		assertThat(homepage.get("featuredExperiences")).isNotNull();
		assertThat(homepage.get("featuredReviews")).isNotNull();
	}

	// ------------------------------------------------------------- roomType(id)

	@Test
	void roomTypeQueryReturnsActiveRoomTypeWithDetails() throws Exception {
		TestFixtures.HotelFixture bookable = fixtures.newBookableHotel();
		bookable.roomType().setIsFeaturedOnHomepage(true);
		roomTypes.saveAndFlush(bookable.roomType());
		addMedia(null, bookable.roomType().getId());

		Map<String, Object> body = post("""
				{
				  roomType(id: "%s") { id name hotelId maxAdults pricePerNight media { url } }
				}
				""".formatted(bookable.roomType().getId()));
		Map<String, Object> roomType = (Map<String, Object>) data(body).get("roomType");
		assertThat(roomType.get("id")).isEqualTo(bookable.roomType().getId().toString());
		assertThat(roomType.get("name")).isEqualTo("Deluxe Room");
		assertThat(roomType.get("pricePerNight")).isEqualTo(TestFixtures.RATE.intValue());
		assertThat(((List<?>) roomType.get("media"))).hasSize(1);
	}

	@Test
	void roomTypeQueryRejectsInactiveOrUnknownRoomTypes() throws Exception {
		TestFixtures.HotelFixture bookable = fixtures.newBookableHotel();
		RoomType draft = newRoomType(bookable.hotelId(), "Draft Room", "draft", true);

		Map<String, Object> draftBody = post("""
				{ roomType(id: "%s") { id } }
				""".formatted(draft.getId()));
		assertThat(((Map<String, Object>) draftBody.get("data")).get("roomType")).isNull();
		assertThat(((List<Map<String, Object>>) draftBody.get("errors")).get(0).get("message"))
				.asString().contains("room type not found");

		Map<String, Object> missingBody = post("{ roomType(id: \"00000000-0000-0000-0000-000000000000\") { id } }");
		assertThat(((Map<String, Object>) missingBody.get("data")).get("roomType")).isNull();
		assertThat(((List<Map<String, Object>>) missingBody.get("errors")).get(0).get("message"))
				.asString().contains("room type not found");
	}
}
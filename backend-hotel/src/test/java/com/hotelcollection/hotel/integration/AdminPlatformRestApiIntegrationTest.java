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
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.entity.Platform;
import com.hotelcollection.hotel.repository.MediaRepository;
import com.hotelcollection.hotel.repository.PlatformRepository;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.JwtService;

/**
 * Admin platform (brand) REST write surface: {@code PUT
 * /api/v1/admin/platform/{id}} and {@code PUT /api/v1/admin/platform/{id}/media}.
 * Exercised over real HTTP with a super_admin bearer, plus authorization
 * (401 anonymous, 403 non-super_admin staff) and a round trip of the new
 * contact_email/contact_phone columns through the public platform(slug)
 * GraphQL query.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ContextConfiguration(classes = TestcontainersConfiguration.class)
class AdminPlatformRestApiIntegrationTest {

	@LocalServerPort
	int port;

	@Autowired
	PlatformRepository platforms;
	@Autowired
	JwtService jwtService;
	@Autowired
	org.springframework.jdbc.core.JdbcTemplate jdbc;
	@Autowired
	MediaRepository mediaRepository;

	private final ObjectMapper objectMapper = new ObjectMapper();
	private final HttpClient http = HttpClient.newBuilder()
			.connectTimeout(Duration.ofSeconds(10)).build();

	private HttpResponse<String> send(String method, String path, Object body, String bearer)
			throws Exception {
		HttpRequest.Builder builder = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + path))
				.header("Content-Type", "application/json");
		if (body == null) {
			builder.method(method, HttpRequest.BodyPublishers.noBody());
		} else {
			builder.method(method,
					HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)));
		}
		if (bearer != null) {
			builder.header("Authorization", "Bearer " + bearer);
		}
		return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> graphql(String query, Map<String, Object> variables) throws Exception {
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

	/** Registers a real user and issues a token carrying the real id —
	 * audit_logs references the users table. register() now only sends an
	 * OTP (no session) — this helper never needs a real one anyway (it
	 * mints its own token with whatever roles the case under test wants),
	 * so it just reads the id straight from the database instead of
	 * completing verification. */
	private String tokenWithRoles(List<String> roles) throws Exception {
		String email = "admin-platform-rest-" + System.nanoTime() + "@example.com";
		HttpResponse<String> registered = send("POST", "/api/v1/auth/register",
				Map.of("firstName", "Admin", "lastName", "Platform", "email", email,
						"password", "secret123"),
				null);
		assertThat(registered.statusCode()).isEqualTo(202);
		String userId = jdbc.queryForObject(
				"select id from users where lower(email) = lower(?)", String.class, email);
		return jwtService.issue(new CurrentUser(UUID.fromString(userId), email, roles, List.of(),
				Instant.now()));
	}

	private Platform newPlatform(String slug) {
		Instant now = Instant.now();
		Platform p = new Platform();
		p.setName("Test Collection");
		p.setSlug(slug);
		p.setTagline("original tagline");
		p.setDescription("original description");
		p.setStatus("active");
		p.setDefaultCurrency("MAD");
		p.setCreatedAt(now);
		p.setUpdatedAt(now);
		return platforms.saveAndFlush(p);
	}

	@Test
	void platformUpdateRequiresAuthentication() throws Exception {
		Platform p = newPlatform("auth-" + System.nanoTime());

		HttpResponse<String> anon = send("PUT", "/api/v1/admin/platform/" + p.getId(),
				Map.of("name", "Nope"), null);
		assertThat(anon.statusCode()).isEqualTo(401);
		assertThat(objectMapper.readTree(anon.body()).get("code").asText())
				.isEqualTo("UNAUTHORIZED");
	}

	@Test
	void platformUpdateRejectsNonSuperAdminStaff() throws Exception {
		Platform p = newPlatform("staff-" + System.nanoTime());
		// hotel_admin is a real staff role but is hotel-scoped, not platform-level.
		String staffToken = tokenWithRoles(List.of("hotel_admin"));

		HttpResponse<String> forbidden = send("PUT", "/api/v1/admin/platform/" + p.getId(),
				Map.of("name", "Should Not Apply"), staffToken);
		assertThat(forbidden.statusCode()).isEqualTo(403);
		assertThat(objectMapper.readTree(forbidden.body()).get("code").asText())
				.isEqualTo("FORBIDDEN");

		// unchanged
		Platform reloaded = platforms.findById(p.getId()).orElseThrow();
		assertThat(reloaded.getName()).isEqualTo("Test Collection");
	}

	@Test
	void superAdminUpdatesBrandAndContactFields() throws Exception {
		Platform p = newPlatform("brand-" + System.nanoTime());
		String token = tokenWithRoles(List.of("super_admin"));

		HttpResponse<String> updated = send("PUT", "/api/v1/admin/platform/" + p.getId(),
				Map.of("name", "The Hotel Collection", "tagline", "Curated stays",
						"description", "A small collection of independent hotels.",
						"contactEmail", "brand@hotelcollection.test",
						"contactPhone", "+212600000000", "defaultCurrency", "MAD",
						"status", "active"),
				token);
		assertThat(updated.statusCode()).isEqualTo(200);
		var json = objectMapper.readTree(updated.body());
		assertThat(json.get("name").asText()).isEqualTo("The Hotel Collection");
		assertThat(json.get("tagline").asText()).isEqualTo("Curated stays");
		assertThat(json.get("contactEmail").asText()).isEqualTo("brand@hotelcollection.test");
		assertThat(json.get("contactPhone").asText()).isEqualTo("+212600000000");

		// nullable fields not sent stay unchanged: description was set above, so
		// re-send without it and confirm it survives.
		HttpResponse<String> partial = send("PUT", "/api/v1/admin/platform/" + p.getId(),
				Map.of("tagline", "Still curated"), token);
		assertThat(partial.statusCode()).isEqualTo(200);
		var partialJson = objectMapper.readTree(partial.body());
		assertThat(partialJson.get("tagline").asText()).isEqualTo("Still curated");
		assertThat(partialJson.get("description").asText())
				.isEqualTo("A small collection of independent hotels.");
		assertThat(partialJson.get("contactEmail").asText()).isEqualTo("brand@hotelcollection.test");

		// round trip through the public read query used by the admin form.
		Map<String, Object> body = graphql("""
				query($slug: String!) {
				  platform(slug: $slug) { name tagline contactEmail contactPhone }
				}
				""", Map.of("slug", p.getSlug()));
		assertThat(body.get("errors")).isNull();
		@SuppressWarnings("unchecked")
		Map<String, Object> platform = (Map<String, Object>) ((Map<String, Object>) body.get("data"))
				.get("platform");
		assertThat(platform.get("contactEmail")).isEqualTo("brand@hotelcollection.test");
		assertThat(platform.get("contactPhone")).isEqualTo("+212600000000");
		assertThat(platform.get("tagline")).isEqualTo("Still curated");
	}

	@Test
	void unknownPlatformIdReturnsNotFound() throws Exception {
		String token = tokenWithRoles(List.of("super_admin"));
		UUID missing = UUID.randomUUID();

		HttpResponse<String> response = send("PUT", "/api/v1/admin/platform/" + missing,
				Map.of("name", "Ghost"), token);
		assertThat(response.statusCode()).isEqualTo(404);
		assertThat(objectMapper.readTree(response.body()).get("code").asText())
				.isEqualTo("NOT_FOUND");
	}

	@Test
	void superAdminReplacesPlatformMedia() throws Exception {
		Platform p = newPlatform("media-" + System.nanoTime());
		String token = tokenWithRoles(List.of("super_admin"));

		// "hero" here, not "logo" — the logo has its own dedicated ownership
		// path (see galleryReplaceAllDropsStrayLogoInputAndPreservesRealLogo
		// below) and is deliberately excluded from this replace-all write.
		HttpResponse<String> media = send("PUT", "/api/v1/admin/platform/" + p.getId() + "/media",
				List.of(Map.of("url", "https://example.com/hero.png", "isPrimary", true,
						"category", "hero")),
				token);
		assertThat(media.statusCode()).isEqualTo(200);
		var json = objectMapper.readTree(media.body());
		assertThat(json.get(0).get("url").asText()).isEqualTo("https://example.com/hero.png");
		// Media.isPrimary() serializes as "primary" (Jackson strips the "is" prefix
		// for boolean getters), same as every other Media JSON response in this suite.
		assertThat(json.get(0).get("primary").asBoolean()).isTrue();

		Map<String, Object> body = graphql("""
				query($slug: String!) { platform(slug: $slug) { media { url category isPrimary } } }
				""", Map.of("slug", p.getSlug()));
		@SuppressWarnings("unchecked")
		Map<String, Object> platform = (Map<String, Object>) ((Map<String, Object>) body.get("data"))
				.get("platform");
		@SuppressWarnings("unchecked")
		List<Map<String, Object>> mediaList = (List<Map<String, Object>>) platform.get("media");
		assertThat(mediaList).hasSize(1);
		assertThat(mediaList.get(0).get("url")).isEqualTo("https://example.com/hero.png");
	}

	/**
	 * The platform logo has its own dedicated upload path
	 * ({@code /api/v1/media/upload}, category="logo") specifically so this
	 * gallery-style replace-all write can neither drop it (by omission) nor
	 * duplicate it (a stray logo-category entry in the input is dropped, not
	 * inserted) — see {@code MediaAdminServiceImpl}'s class javadoc.
	 */
	@Test
	void galleryReplaceAllDropsStrayLogoInputAndPreservesRealLogo() throws Exception {
		Platform p = newPlatform("media-logo-" + System.nanoTime());
		String token = tokenWithRoles(List.of("super_admin"));

		Media logo = new Media();
		logo.setUrl("https://example.com/logo.png");
		logo.setStorageKey("logo-" + System.nanoTime());
		logo.setCategory("logo");
		logo.setPlatformId(p.getId());
		logo.setPrimary(false);
		logo.setSortOrder((short) 0);
		logo.setCreatedAt(Instant.now());
		UUID logoId = mediaRepository.saveAndFlush(logo).getId();

		HttpResponse<String> replaced = send("PUT", "/api/v1/admin/platform/" + p.getId() + "/media",
				List.of(
						Map.of("url", "https://example.com/hero.png", "isPrimary", true, "category", "hero"),
						Map.of("url", "https://example.com/sneaky-logo.png", "isPrimary", false, "category", "logo")),
				token);
		assertThat(replaced.statusCode()).isEqualTo(200);
		assertThat(objectMapper.readTree(replaced.body())).hasSize(1);

		List<Media> platformMedia = mediaRepository.findByPlatformId(p.getId());
		assertThat(platformMedia.stream().filter(m -> "logo".equals(m.getCategory())))
				.hasSize(1)
				.allSatisfy(m -> assertThat(m.getId()).isEqualTo(logoId));
		assertThat(platformMedia.stream().filter(m -> "hero".equals(m.getCategory())))
				.hasSize(1);
	}

	@Test
	void mediaReplaceRejectsNonSuperAdminStaff() throws Exception {
		Platform p = newPlatform("media-staff-" + System.nanoTime());
		String staffToken = tokenWithRoles(List.of("hotel_admin"));

		HttpResponse<String> forbidden = send("PUT", "/api/v1/admin/platform/" + p.getId() + "/media",
				List.of(Map.of("url", "https://example.com/logo.png", "isPrimary", true)),
				staffToken);
		assertThat(forbidden.statusCode()).isEqualTo(403);
	}
}

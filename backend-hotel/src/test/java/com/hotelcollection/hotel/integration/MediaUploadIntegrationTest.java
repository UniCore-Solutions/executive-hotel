package com.hotelcollection.hotel.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.entity.Platform;
import com.hotelcollection.hotel.integration.TestcontainersConfiguration;
import com.hotelcollection.hotel.integration.TestFixtures;
import com.hotelcollection.hotel.repository.MediaRepository;
import com.hotelcollection.hotel.repository.PlatformRepository;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.JwtService;
import com.hotelcollection.hotel.storage.MediaStorageProvider;
import com.hotelcollection.hotel.storage.LocalFilesystemMediaStorageProvider;

/**
 * Media upload/delete over REST (multipart): full flow (bytes on disk,
 * metadata in PostgreSQL, visible via GraphQL), primary replacement with no
 * leftover files, and the approved security cases — authz, invalid MIME,
 * oversized, executable bytes, traversal-style filenames.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ContextConfiguration(classes = TestcontainersConfiguration.class)
class MediaUploadIntegrationTest {
	private static UUID uid(long n) { return new UUID(0, n); }

	private static final byte[] PNG_1PX = Base64.getDecoder().decode(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
	private static final byte[] JPEG_HEAD = { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0,
			0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01,
			0x00, 0x00, (byte) 0xFF, (byte) 0xD9 };
	private static final byte[] EXE_HEAD = { 0x4D, 0x5A, 0x00, 0x00, 0x00, 0x00 };

	@LocalServerPort
	int port;

	@Autowired
	MockMvc mvc;
	@Autowired
	TestFixtures fixtures;
	@Autowired
	PlatformRepository platforms;
	@Autowired
	MediaRepository media;
	@Autowired
	MediaStorageProvider storage;
	@Autowired
	JwtService jwtService;

	private final ObjectMapper objectMapper = new ObjectMapper();
	private final HttpClient http = HttpClient.newBuilder()
			.connectTimeout(Duration.ofSeconds(10)).build();

	private String token() {
		return jwtService.issue(new CurrentUser(uid(999), "upload@example.com",
				List.of("super_admin"), List.of(), Instant.now()));
	}

	private String staffToken(UUID hotelId) {
		return jwtService.issue(new CurrentUser(uid(1000), "staff@example.com",
				List.of("hotel_manager"), List.of(hotelId), Instant.now()));
	}

	private String guestToken() {
		return jwtService.issue(new CurrentUser(uid(1001), "guest@example.com",
				List.of(), List.of(), Instant.now()));
	}

	private UUID upload(String ownerType, UUID ownerId, byte[] bytes, String fileName,
			String contentType, String bearer, boolean isPrimary) throws Exception {
		return upload(ownerType, ownerId, bytes, fileName, contentType, bearer, isPrimary, null);
	}

	private UUID upload(String ownerType, UUID ownerId, byte[] bytes, String fileName,
			String contentType, String bearer, boolean isPrimary, String category) throws Exception {
		var builder = multipart("/api/v1/media/upload")
				.file(new MockMultipartFile("file", fileName, contentType, bytes))
				.param("ownerType", ownerType)
				.param("ownerId", String.valueOf(ownerId))
				.param("isPrimary", String.valueOf(isPrimary));
		if (category != null) {
			builder = builder.param("category", category);
		}
		if (bearer != null) {
			builder = builder.header("Authorization", "Bearer " + bearer);
		}
		String body = mvc.perform(builder)
				.andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString();
		return UUID.fromString(objectMapper.readTree(body).get("id").asText());
	}

	@Test
	void uploadStoresBytesMetadataAndIsQueryable() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		UUID mediaId = upload("hotel", fx.hotelId(), PNG_1PX, "room.png", "image/png",
				token(), true);
		Media row = media.findById(mediaId).orElseThrow();
		assertThat(row.getStorageKey()).isNotBlank();
		assertThat(row.getUrl()).endsWith("/media/" + row.getStorageKey());
		assertThat(storage.exists(row.getStorageKey())).isTrue();
		assertThat(row.getMimeType()).isEqualTo("image/png");
		assertThat(row.getHotelId()).isEqualTo(fx.hotelId());
		assertThat(row.isPrimary()).isTrue();

		HttpRequest request = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + "/graphql"))
				.header("Content-Type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(
						Map.of("query", "query($id: ID!) { hotel(id: $id) { media { id url } } }",
								"variables", Map.of("id", fx.hotelId().toString())))))
				.build();
		HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
		Map<String, Object> body = objectMapper.readValue(response.body(), Map.class);
		assertThat(body.get("errors")).isNull();
		List<Map<String, Object>> mediaList = (List<Map<String, Object>>) ((Map<String, Object>)
				((Map<String, Object>) body.get("data")).get("hotel")).get("media");
		assertThat(mediaList).anyMatch(m -> m.get("id").equals(mediaId.toString()));
	}

	@Test
	void uploadRequiresAuthentication() throws Exception {
		mvc.perform(multipart("/api/v1/media/upload")
						.file(new MockMultipartFile("file", "x.png", "image/png", PNG_1PX))
						.param("ownerType", "hotel")
						.param("ownerId", uid(1).toString()))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void uploadRejectsInvalidMimeType() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		mvc.perform(multipart("/api/v1/media/upload")
						.file(new MockMultipartFile("file", "notes.txt", "text/plain",
								"hello world".getBytes()))
						.param("ownerType", "hotel")
						.param("ownerId", String.valueOf(fx.hotelId()))
						.header("Authorization", "Bearer " + token()))
				.andExpect(status().isBadRequest());
	}

	@Test
	void uploadRejectsExecutableBytes() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		mvc.perform(multipart("/api/v1/media/upload")
						.file(new MockMultipartFile("file", "evil.exe",
								MediaType.APPLICATION_OCTET_STREAM_VALUE, EXE_HEAD))
						.param("ownerType", "hotel")
						.param("ownerId", String.valueOf(fx.hotelId()))
						.header("Authorization", "Bearer " + token()))
				.andExpect(status().isBadRequest());
	}

	@Test
	void uploadRejectsOversizedFile() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		byte[] huge = new byte[LocalFilesystemMediaStorageProvider.MAX_SIZE_BYTES + 1];
		System.arraycopy(PNG_1PX, 0, huge, 0, PNG_1PX.length);
		mvc.perform(multipart("/api/v1/media/upload")
						.file(new MockMultipartFile("file", "big.png", "image/png", huge))
						.param("ownerType", "hotel")
						.param("ownerId", String.valueOf(fx.hotelId()))
						.header("Authorization", "Bearer " + token()))
				.andExpect(status().isBadRequest());
	}

	@Test
	void traversalFilenameIsSanitized() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		UUID mediaId = upload("hotel", fx.hotelId(), PNG_1PX, "../../evil.png", "image/png",
				token(), false);
		Media row = media.findById(mediaId).orElseThrow();
		assertThat(row.getStorageKey()).doesNotContain("..");
		assertThat(row.getStorageKey()).endsWith(".png");
		assertThat(storage.exists(row.getStorageKey())).isTrue();
	}

	@Test
	void primaryUploadReplacesPreviousWithoutLeftovers() throws Exception {
		Platform p = new Platform();
		p.setName("Upload Collection");
		p.setSlug("upload-" + System.nanoTime());
		p.setStatus("active");
		p.setCreatedAt(Instant.now());
		p.setUpdatedAt(Instant.now());
		platforms.saveAndFlush(p);

		UUID first = upload("platform", p.getId(), PNG_1PX, "a.png", "image/png", token(), true);
		String firstKey = media.findById(first).orElseThrow().getStorageKey();
		UUID second = upload("platform", p.getId(), JPEG_HEAD, "b.jpg", "image/jpeg", token(), true);
		Media secondRow = media.findById(second).orElseThrow();

		assertThat(storage.exists(firstKey)).isFalse();
		assertThat(storage.exists(secondRow.getStorageKey())).isTrue();
		assertThat(media.findByPlatformId(p.getId()).stream().filter(Media::isPrimary))
				.hasSize(1);
	}

	@Test
	void logoUploadReplacesPreviousLogoWithoutLeftovers() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();

		UUID first = upload("hotel", fx.hotelId(), PNG_1PX, "logo1.png", "image/png",
				token(), false, "logo");
		String firstKey = media.findById(first).orElseThrow().getStorageKey();
		UUID second = upload("hotel", fx.hotelId(), JPEG_HEAD, "logo2.jpg", "image/jpeg",
				token(), false, "logo");
		Media secondRow = media.findById(second).orElseThrow();

		assertThat(storage.exists(firstKey)).isFalse();
		assertThat(storage.exists(secondRow.getStorageKey())).isTrue();
		assertThat(media.findByHotelId(fx.hotelId()).stream()
				.filter(m -> "logo".equals(m.getCategory())))
				.hasSize(1);
	}

	@Test
	void logoAndGalleryPhotoCoexistAsSeparateRoles() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();

		UUID logo = upload("hotel", fx.hotelId(), PNG_1PX, "logo.png", "image/png",
				token(), false, "logo");
		UUID gallery = upload("hotel", fx.hotelId(), JPEG_HEAD, "room.jpg", "image/jpeg",
				token(), true, "gallery");

		List<Media> hotelMedia = media.findByHotelId(fx.hotelId());
		assertThat(hotelMedia).hasSize(2);
		assertThat(hotelMedia.stream().filter(m -> m.getId().equals(logo)).findFirst().orElseThrow()
				.getCategory()).isEqualTo("logo");
		assertThat(hotelMedia.stream().filter(m -> m.getId().equals(gallery)).findFirst().orElseThrow()
				.isPrimary()).isTrue();
	}

	@Test
	void deleteRemovesFileAndRow() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		UUID mediaId = upload("hotel", fx.hotelId(), PNG_1PX, "room.png", "image/png",
				token(), false);
		String key = media.findById(mediaId).orElseThrow().getStorageKey();
		assertThat(storage.exists(key)).isTrue();

		mvc.perform(delete("/api/v1/media/" + mediaId)
						.header("Authorization", "Bearer " + token()))
				.andExpect(status().isNoContent());
		assertThat(storage.exists(key)).isFalse();
		assertThat(media.findById(mediaId)).isEmpty();
	}

	@Test
	void deleteRequiresAuthentication() throws Exception {
		mvc.perform(delete("/api/v1/media/1")).andExpect(status().isUnauthorized());
	}

	@Test
	void guestCannotUploadToHotelMedia() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		mvc.perform(multipart("/api/v1/media/upload")
						.file(new MockMultipartFile("file", "room.png", "image/png", PNG_1PX))
						.param("ownerType", "hotel")
						.param("ownerId", String.valueOf(fx.hotelId()))
						.header("Authorization", "Bearer " + guestToken()))
				.andExpect(status().isForbidden());
	}

	@Test
	void staffOfTheHotelCanUpload() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		UUID mediaId = upload("hotel", fx.hotelId(), PNG_1PX, "room.png", "image/png",
				staffToken(fx.hotelId()), false);
		Media row = media.findById(mediaId).orElseThrow();
		assertThat(row.getHotelId()).isEqualTo(fx.hotelId());
	}

	@Test
	void guestCannotUploadPlatformMedia() throws Exception {
		Platform p = new Platform();
		p.setName("Upload Collection");
		p.setSlug("upload-" + System.nanoTime());
		p.setStatus("active");
		p.setCreatedAt(Instant.now());
		p.setUpdatedAt(Instant.now());
		platforms.saveAndFlush(p);
		mvc.perform(multipart("/api/v1/media/upload")
						.file(new MockMultipartFile("file", "hero.png", "image/png", PNG_1PX))
						.param("ownerType", "platform")
						.param("ownerId", String.valueOf(p.getId()))
						.header("Authorization", "Bearer " + staffToken(uid(1))))
				.andExpect(status().isForbidden());
	}

	@Test
	void staffOfAnotherHotelCannotDeleteMedia() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		UUID mediaId = upload("hotel", fx.hotelId(), PNG_1PX, "room.png", "image/png",
				token(), false);
		mvc.perform(delete("/api/v1/media/" + mediaId)
						.header("Authorization", "Bearer " + staffToken(UUID.randomUUID())))
				.andExpect(status().isForbidden());
		assertThat(media.findById(mediaId)).isPresent();
	}
}
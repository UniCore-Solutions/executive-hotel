package com.hotelcollection.hotel.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ContextConfiguration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelcollection.hotel.entity.CreditNote;
import com.hotelcollection.hotel.entity.Invoice;
import com.hotelcollection.hotel.repository.CreditNoteRepository;
import com.hotelcollection.hotel.repository.InvoiceRepository;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.JwtService;
import com.hotelcollection.hotel.storage.DocumentStorageProvider;

/**
 * Server-side invoice/credit-note PDF generation over real HTTP: eager
 * generation at issuance, on-demand generate-or-reuse at download,
 * regeneration when the stored file goes missing, and the guest/staff
 * authorization boundaries (never the id alone).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ContextConfiguration(classes = TestcontainersConfiguration.class)
class DocumentGenerationIntegrationTest {

	private static UUID uid(long n) {
		return new UUID(0, n);
	}

	private static final byte[] PDF_MAGIC = { '%', 'P', 'D', 'F' };

	@LocalServerPort
	int port;

	@Autowired
	TestFixtures fixtures;
	@Autowired
	JwtService jwtService;
	@Autowired
	InvoiceRepository invoiceRepository;
	@Autowired
	CreditNoteRepository creditNoteRepository;
	@Autowired
	DocumentStorageProvider documentStorage;

	private final ObjectMapper objectMapper = new ObjectMapper();
	private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

	private String superAdminToken() {
		return jwtService.issue(new CurrentUser(uid(9001), "staff-super@example.com",
				List.of("super_admin"), List.of(), Instant.now()));
	}

	private String hotelScopedToken(UUID hotelId) {
		return jwtService.issue(new CurrentUser(uid(9002), "staff-scoped@example.com",
				List.of("hotel_admin"), List.of(hotelId), Instant.now()));
	}

	private HttpResponse<String> postJson(String path, Object body, String bearer) throws Exception {
		HttpRequest.Builder builder = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + path))
				.header("Content-Type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)));
		if (bearer != null) {
			builder.header("Authorization", "Bearer " + bearer);
		}
		return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
	}

	private HttpResponse<String> postJsonWithKey(String path, Object body, String idempotencyKey) throws Exception {
		HttpRequest.Builder builder = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + path))
				.header("Content-Type", "application/json")
				.header("Idempotency-Key", idempotencyKey)
				.POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)));
		return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
	}

	private HttpResponse<byte[]> postPdf(String path, Object body, String bearer) throws Exception {
		HttpRequest.Builder builder = HttpRequest.newBuilder()
				.uri(URI.create("http://localhost:" + port + path))
				.header("Content-Type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)));
		if (bearer != null) {
			builder.header("Authorization", "Bearer " + bearer);
		}
		return http.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());
	}

	private HttpResponse<byte[]> getPdf(String path, String bearer) throws Exception {
		HttpRequest.Builder builder = HttpRequest.newBuilder().uri(URI.create("http://localhost:" + port + path));
		if (bearer != null) {
			builder.header("Authorization", "Bearer " + bearer);
		}
		return http.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());
	}

	/** Books, pays and captures a reservation (mirrors
	 * RestApiIntegrationTest#paymentAndInvoiceRequireAuthenticatedActor),
	 * returning [reference, reservationId, guestEmail]. Capture confirms the
	 * reservation, which eagerly issues its invoice + PDF. */
	private String[] confirmedReservationWithInvoice(TestFixtures.HotelFixture fx, String staff) throws Exception {
		String guestEmail = "doc-pdf-" + System.nanoTime() + "@example.com";
		Map<String, Object> body = Map.of(
				"hotelId", fx.hotelId(),
				"checkInDate", LocalDate.now().plusDays(11).toString(),
				"checkOutDate", LocalDate.now().plusDays(12).toString(),
				"adults", 2, "children", 0,
				"currencyCode", TestFixtures.CURRENCY,
				"guest", Map.of("firstName", "Doc", "lastName", "Guest", "email", guestEmail),
				"rooms", List.of(Map.of("roomTypeId", fx.roomType().getId(), "ratePlanId", fx.ratePlan().getId())),
				"extras", List.of());
		HttpResponse<String> created = postJsonWithKey("/api/v1/reservations", body,
				"doc-pdf-" + System.nanoTime());
		assertThat(created.statusCode()).isEqualTo(201);
		String reference = objectMapper.readTree(created.body()).get("reference").asText();
		String reservationId = objectMapper.readTree(created.body()).get("id").asText();
		// Pay the actual total (taxes/fees included), not a guessed amount —
		// underpaying leaves the reservation 'pending' rather than 'confirmed',
		// and eager invoice/PDF issuance only fires on confirmation.
		double total = objectMapper.readTree(created.body()).get("totalAmount").asDouble();

		HttpResponse<String> paid = postJson("/api/v1/payments",
				Map.of("reservationId", UUID.fromString(reservationId), "amount", total,
						"currencyCode", TestFixtures.CURRENCY, "provider", "mock",
						"idempotencyKey", "doc-pdf-pay-" + System.nanoTime()),
				staff);
		assertThat(paid.statusCode()).isEqualTo(201);
		String paymentId = objectMapper.readTree(paid.body()).get("id").asText();

		HttpResponse<String> captured = postJson("/api/v1/payments/" + paymentId + "/capture", Map.of(), staff);
		assertThat(captured.statusCode()).isEqualTo(200);

		return new String[] { reference, reservationId, guestEmail };
	}

	@Test
	void invoicePdfIsEagerlyGeneratedAndReusedThenRegeneratedIfMissing() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String staff = superAdminToken();
		String[] r = confirmedReservationWithInvoice(fx, staff);
		String reservationId = r[1];

		// Eager generation at issuance: the row already carries a PDF before
		// any download endpoint is ever called.
		Invoice invoice = invoiceRepository.findByReservationId(UUID.fromString(reservationId)).orElseThrow();
		assertThat(invoice.getPdfStorageKey()).isNotBlank();
		assertThat(invoice.getPdfGeneratedAt()).isNotNull();
		byte[] stored = documentStorage.read(invoice.getPdfStorageKey());
		assertThat(stored).startsWith(PDF_MAGIC);

		// Download reuses the already-stored bytes rather than re-rendering.
		HttpResponse<byte[]> download = getPdf("/api/v1/admin/reservations/" + reservationId + "/invoice/pdf", staff);
		assertThat(download.statusCode()).isEqualTo(200);
		assertThat(download.headers().firstValue("content-type")).contains("application/pdf");
		assertThat(download.body()).isEqualTo(stored);

		// Regeneration: delete the file on disk but keep the DB row's key —
		// the next download must notice the file is gone and render again.
		documentStorage.delete(invoice.getPdfStorageKey());
		assertThat(documentStorage.exists(invoice.getPdfStorageKey())).isFalse();

		HttpResponse<byte[]> regenerated = getPdf("/api/v1/admin/reservations/" + reservationId + "/invoice/pdf",
				staff);
		assertThat(regenerated.statusCode()).isEqualTo(200);
		assertThat(regenerated.body()).startsWith(PDF_MAGIC);
		assertThat(documentStorage.exists(invoice.getPdfStorageKey())).isTrue();
	}

	@Test
	void guestCanDownloadOwnInvoiceButNotWithWrongEmail() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String staff = superAdminToken();
		String[] r = confirmedReservationWithInvoice(fx, staff);
		String reference = r[0];
		String guestEmail = r[2];

		HttpResponse<byte[]> ok = postPdf("/api/v1/reservations/" + reference + "/invoice/pdf",
				Map.of("email", guestEmail), null);
		assertThat(ok.statusCode()).isEqualTo(200);
		assertThat(ok.body()).startsWith(PDF_MAGIC);

		// Wrong email — the reservation reference alone must never be enough.
		HttpResponse<byte[]> wrongEmail = postPdf("/api/v1/reservations/" + reference + "/invoice/pdf",
				Map.of("email", "someone-else@example.com"), null);
		assertThat(wrongEmail.statusCode()).isEqualTo(404);
	}

	@Test
	void staffCannotDownloadAnotherHotelsInvoice() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		TestFixtures.HotelFixture otherHotel = fixtures.newBookableHotel();
		String staff = superAdminToken();
		String[] r = confirmedReservationWithInvoice(fx, staff);
		String reservationId = r[1];

		String scopedToOtherHotel = hotelScopedToken(otherHotel.hotelId());
		HttpResponse<byte[]> forbidden = getPdf("/api/v1/admin/reservations/" + reservationId + "/invoice/pdf",
				scopedToOtherHotel);
		assertThat(forbidden.statusCode()).isEqualTo(403);

		String scopedToOwnHotel = hotelScopedToken(fx.hotelId());
		HttpResponse<byte[]> allowed = getPdf("/api/v1/admin/reservations/" + reservationId + "/invoice/pdf",
				scopedToOwnHotel);
		assertThat(allowed.statusCode()).isEqualTo(200);
	}

	@Test
	void creditNotePdfIsIssuedOnCancellationAndDownloadable() throws Exception {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String staff = superAdminToken();
		String[] r = confirmedReservationWithInvoice(fx, staff);
		String reference = r[0];
		String reservationId = r[1];
		String guestEmail = r[2];

		// No credit note exists yet — the PDF endpoint must 404, not fabricate one.
		HttpResponse<byte[]> tooEarly = getPdf("/api/v1/admin/reservations/" + reservationId + "/credit-note/pdf",
				staff);
		assertThat(tooEarly.statusCode()).isEqualTo(404);

		HttpResponse<String> cancelled = postJson("/api/v1/reservations/" + reference + "/cancel",
				Map.of("email", guestEmail, "reasonCode", "guest_changed_plans", "reasonNote", "changed plans"),
				null);
		assertThat(cancelled.statusCode()).isEqualTo(200);

		CreditNote note = creditNoteRepository.findByReservationId(UUID.fromString(reservationId)).orElseThrow();
		assertThat(note.getPdfStorageKey()).isNotBlank();

		HttpResponse<byte[]> download = getPdf("/api/v1/admin/reservations/" + reservationId + "/credit-note/pdf",
				staff);
		assertThat(download.statusCode()).isEqualTo(200);
		assertThat(download.body()).startsWith(PDF_MAGIC);
	}
}

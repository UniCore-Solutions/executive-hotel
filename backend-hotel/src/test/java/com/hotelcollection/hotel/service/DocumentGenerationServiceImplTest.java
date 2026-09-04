package com.hotelcollection.hotel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import com.hotelcollection.hotel.entity.CreditNote;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.Invoice;
import com.hotelcollection.hotel.entity.InvoiceItem;
import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.repository.CancellationReasonRepository;
import com.hotelcollection.hotel.repository.InvoiceRepository;
import com.hotelcollection.hotel.repository.MediaRepository;
import com.hotelcollection.hotel.service.impl.DocumentGenerationServiceImpl;
import com.hotelcollection.hotel.storage.DocumentStorageProvider;
import com.hotelcollection.hotel.storage.LocalFilesystemDocumentStorageProvider;
import com.hotelcollection.hotel.storage.MediaStorageProvider;

/**
 * Unit coverage for the HTML->PDF rendering pipeline itself: real Thymeleaf
 * templates, real openhtmltopdf conversion, real filesystem storage (a temp
 * dir) — only the reservation/hotel lookups are mocked, since those belong
 * to other services. Plain JUnit: the render is fast enough not to need the
 * full Spring context or Testcontainers.
 */
class DocumentGenerationServiceImplTest {

	private static final byte[] PDF_MAGIC = { '%', 'P', 'D', 'F' };

	private final UUID reservationId = UUID.randomUUID();
	private final UUID hotelId = UUID.randomUUID();

	private DocumentGenerationServiceImpl service(Path storageRoot) {
		SpringTemplateEngine templateEngine = new SpringTemplateEngine();
		ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
		// Mirrors Spring Boot's default spring.thymeleaf.prefix.
		resolver.setPrefix("templates/");
		resolver.setTemplateMode(TemplateMode.XML);
		resolver.setSuffix(".html");
		templateEngine.setTemplateResolver(resolver);

		DocumentStorageProvider storage = new LocalFilesystemDocumentStorageProvider(storageRoot);

		BookingService booking = mock(BookingService.class);
		CatalogQueryService catalog = mock(CatalogQueryService.class);
		Reservation reservation = new Reservation();
		reservation.setId(reservationId);
		reservation.setHotelId(hotelId);
		reservation.setReference("RES-TEST-1");
		reservation.setCheckInDate(LocalDate.of(2026, 1, 1));
		reservation.setCheckOutDate(LocalDate.of(2026, 1, 4));
		reservation.setAdults((short) 2);
		reservation.setChildren((short) 0);
		when(booking.getById(reservationId)).thenReturn(reservation);
		Hotel hotel = new Hotel();
		hotel.setId(hotelId);
		hotel.setName("Executive Hotel");
		hotel.setCity("Lisbon");
		hotel.setCountryCode("PT");
		when(catalog.getHotel(hotelId)).thenReturn(hotel);

		MediaRepository mediaRepository = mock(MediaRepository.class);
		MediaStorageProvider mediaStorage = mock(MediaStorageProvider.class);
		CancellationReasonRepository cancellationReasonRepository = mock(CancellationReasonRepository.class);
		InvoiceRepository invoiceRepository = mock(InvoiceRepository.class);

		return new DocumentGenerationServiceImpl(templateEngine, storage, booking, catalog,
				mediaRepository, mediaStorage, cancellationReasonRepository, invoiceRepository);
	}

	private Invoice invoiceFixture() {
		Invoice invoice = new Invoice();
		invoice.setId(UUID.randomUUID());
		invoice.setReservationId(reservationId);
		invoice.setInvoiceNumber("INV-TEST-1");
		// Deliberately malicious: if th:text ever regressed to th:utext, this
		// would break out of its text node and openhtmltopdf's strict XML
		// parser would throw rather than produce a PDF — reaching a valid PDF
		// below is itself the proof the escaping held.
		invoice.setBillingName("<script>alert(1)</script> & Associates");
		invoice.setCurrencyCode("MAD");
		invoice.setSubtotalAmount(new BigDecimal("1000.00"));
		invoice.setDiscountAmount(BigDecimal.ZERO);
		invoice.setTaxAmount(new BigDecimal("120.00"));
		invoice.setFeeAmount(new BigDecimal("50.00"));
		invoice.setTotalAmount(new BigDecimal("1170.00"));
		invoice.setIssuedAt(Instant.now());
		InvoiceItem item = new InvoiceItem();
		item.setDescription("Room stay: 3 nights");
		item.setItemType("room");
		item.setQuantity(BigDecimal.ONE);
		item.setUnitPrice(new BigDecimal("1000.00"));
		item.setTotalPrice(new BigDecimal("1000.00"));
		item.setSortOrder((short) 0);
		invoice.getItems().add(item);
		return invoice;
	}

	private CreditNote creditNoteFixture() {
		CreditNote note = new CreditNote();
		note.setId(UUID.randomUUID());
		note.setReservationId(reservationId);
		note.setCreditNoteNumber("CN-TEST-1");
		note.setBillingName("Jane Doe");
		note.setCurrencyCode("MAD");
		note.setOriginalAmount(new BigDecimal("1170.00"));
		note.setPenaltyAmount(new BigDecimal("100.00"));
		note.setCreditedAmount(new BigDecimal("1070.00"));
		note.setIssuedAt(Instant.now());
		return note;
	}

	@Test
	void rendersInvoicePdfEscapesGuestInputAndStoresIt(@TempDir Path tempDir) throws Exception {
		DocumentGenerationServiceImpl svc = service(tempDir);
		Invoice invoice = invoiceFixture();

		byte[] pdf = svc.generateInvoicePdf(invoice);

		assertThat(pdf).isNotEmpty();
		assertThat(pdf).startsWith(PDF_MAGIC);
		DocumentStorageProvider storage = new LocalFilesystemDocumentStorageProvider(tempDir);
		assertThat(storage.read(DocumentGenerationService.invoiceStorageKey(invoice.getId()))).isEqualTo(pdf);

		// The real proof of escaping: unescaped "<script>" would be consumed as
		// XML tag delimiters (not visible text) and "&" alone would have made
		// the template fail to parse at all. Extracting the rendered text and
		// finding the literal angle brackets/ampersand means th:text escaped
		// them to entities that decoded back to visible characters — exactly
		// what should happen, and the opposite of what a th:utext regression
		// would produce.
		String text = extractText(pdf);
		assertThat(text).contains("<script>alert(1)</script> & Associates");
	}

	private String extractText(byte[] pdf) throws Exception {
		try (org.apache.pdfbox.pdmodel.PDDocument doc = org.apache.pdfbox.Loader.loadPDF(pdf)) {
			return new org.apache.pdfbox.text.PDFTextStripper().getText(doc);
		}
	}

	@Test
	void rendersCreditNotePdfAndStoresIt(@TempDir Path tempDir) {
		DocumentGenerationServiceImpl svc = service(tempDir);
		CreditNote note = creditNoteFixture();

		byte[] pdf = svc.generateCreditNotePdf(note);

		assertThat(pdf).startsWith(PDF_MAGIC);
		DocumentStorageProvider storage = new LocalFilesystemDocumentStorageProvider(tempDir);
		assertThat(storage.read(DocumentGenerationService.creditNoteStorageKey(note.getId()))).isEqualTo(pdf);
	}
}

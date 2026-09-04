package com.hotelcollection.hotel.service.impl;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.thymeleaf.ITemplateEngine;
import org.thymeleaf.context.Context;

import com.hotelcollection.hotel.dto.billing.CreditNoteDocumentData;
import com.hotelcollection.hotel.dto.billing.InvoiceDocumentData;
import com.hotelcollection.hotel.entity.CancellationReason;
import com.hotelcollection.hotel.entity.CreditNote;
import com.hotelcollection.hotel.entity.Guest;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.Invoice;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.entity.ReservationCancellation;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.repository.CancellationReasonRepository;
import com.hotelcollection.hotel.repository.InvoiceRepository;
import com.hotelcollection.hotel.repository.MediaRepository;
import com.hotelcollection.hotel.service.BookingService;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.service.DocumentGenerationService;
import com.hotelcollection.hotel.storage.DocumentStorageProvider;
import com.hotelcollection.hotel.storage.MediaStorageProvider;

import com.openhtmltopdf.extend.FSUriResolver;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;

/**
 * The whole HTML -> PDF pipeline for invoice/credit-note documents: build a
 * template-facing data model from the authoritative entities, render the
 * Thymeleaf template, convert to PDF (openhtmltopdf), store the bytes. No
 * business/domain logic (issuance rules, idempotency, authorization) lives
 * here — that's {@code InvoiceServiceImpl}'s job; this class only turns a
 * row that already exists into a PDF that already exists.
 */
@Service
public class DocumentGenerationServiceImpl implements DocumentGenerationService {

	private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter
			.ofPattern("d MMMM yyyy", Locale.ENGLISH).withZone(ZoneOffset.UTC);

	private static final DateTimeFormatter DAY_FORMAT = DateTimeFormatter
			.ofPattern("EEE, d MMM yyyy", Locale.ENGLISH);

	/**
	 * Every referenced URI (image, stylesheet, font) is rejected rather than
	 * fetched, with one deliberate exception: a {@code data:} URI is already
	 * a self-contained, inline payload — resolving it triggers no filesystem
	 * or network access, so it cannot be an XXE/SSRF vector the way an
	 * {@code http(s):}/{@code file:} reference could. The only {@code data:}
	 * URIs this pipeline ever produces are the ones it base64-encodes itself
	 * from server-controlled hotel/platform logo bytes (see
	 * {@link #resolveLogoDataUri}) — never an interpolated value from
	 * guest-controlled text.
	 */
	private static final FSUriResolver DATA_URI_ONLY = (baseUri, uri) -> uri != null && uri.startsWith("data:")
			? uri
			: null;

	private final ITemplateEngine templateEngine;
	private final DocumentStorageProvider documentStorage;
	private final BookingService booking;
	private final CatalogQueryService catalog;
	private final MediaRepository mediaRepository;
	private final MediaStorageProvider mediaStorage;
	private final CancellationReasonRepository cancellationReasonRepository;
	private final InvoiceRepository invoiceRepository;

	public DocumentGenerationServiceImpl(ITemplateEngine templateEngine,
			DocumentStorageProvider documentStorage, BookingService booking,
			CatalogQueryService catalog, MediaRepository mediaRepository,
			MediaStorageProvider mediaStorage, CancellationReasonRepository cancellationReasonRepository,
			InvoiceRepository invoiceRepository) {
		this.templateEngine = templateEngine;
		this.documentStorage = documentStorage;
		this.booking = booking;
		this.catalog = catalog;
		this.mediaRepository = mediaRepository;
		this.mediaStorage = mediaStorage;
		this.cancellationReasonRepository = cancellationReasonRepository;
		this.invoiceRepository = invoiceRepository;
	}

	@Override
	public byte[] generateInvoicePdf(Invoice invoice) {
		Reservation reservation = booking.getById(invoice.getReservationId());
		Hotel hotel = catalog.getHotel(reservation.getHotelId());
		InvoiceDocumentData data = toDocumentData(invoice, reservation, hotel);
		Context ctx = new Context();
		ctx.setVariable("invoiceNumber", data.invoiceNumber());
		ctx.setVariable("logoDataUri", data.logoDataUri());
		ctx.setVariable("hotelName", data.hotelName());
		ctx.setVariable("hotelAddress", data.hotelAddress());
		ctx.setVariable("hotelPhone", data.hotelPhone());
		ctx.setVariable("hotelEmail", data.hotelEmail());
		ctx.setVariable("billingName", data.billingName());
		ctx.setVariable("guestEmail", data.guestEmail());
		ctx.setVariable("guestPhone", data.guestPhone());
		ctx.setVariable("guestCountryCode", data.guestCountryCode());
		ctx.setVariable("issuedAtDisplay", data.issuedAtDisplay());
		ctx.setVariable("reservationReference", data.reservationReference());
		ctx.setVariable("checkInDisplay", data.checkInDisplay());
		ctx.setVariable("checkOutDisplay", data.checkOutDisplay());
		ctx.setVariable("nightsDisplay", data.nightsDisplay());
		ctx.setVariable("occupancyDisplay", data.occupancyDisplay());
		ctx.setVariable("roomTypeSummary", data.roomTypeSummary());
		ctx.setVariable("items", data.items().stream().map(this::asMap).toList());
		ctx.setVariable("subtotalAmount", data.subtotalAmount());
		ctx.setVariable("discountAmount", data.discountAmount());
		ctx.setVariable("taxAmount", data.taxAmount());
		ctx.setVariable("feeAmount", data.feeAmount());
		ctx.setVariable("totalAmount", data.totalAmount());
		ctx.setVariable("hasDiscount", data.hasDiscount());

		String html = templateEngine.process("invoices/payment-invoice", ctx);
		byte[] pdf = renderPdf(html);
		documentStorage.store(pdf, DocumentGenerationService.invoiceStorageKey(invoice.getId()));
		return pdf;
	}

	@Override
	public byte[] generateCreditNotePdf(CreditNote creditNote) {
		Reservation reservation = booking.getById(creditNote.getReservationId());
		Hotel hotel = catalog.getHotel(reservation.getHotelId());
		CreditNoteDocumentData data = toDocumentData(creditNote, reservation, hotel);
		Context ctx = new Context();
		ctx.setVariable("creditNoteNumber", data.creditNoteNumber());
		ctx.setVariable("invoiceNumber", data.invoiceNumber());
		ctx.setVariable("logoDataUri", data.logoDataUri());
		ctx.setVariable("hotelName", data.hotelName());
		ctx.setVariable("hotelAddress", data.hotelAddress());
		ctx.setVariable("hotelPhone", data.hotelPhone());
		ctx.setVariable("hotelEmail", data.hotelEmail());
		ctx.setVariable("billingName", data.billingName());
		ctx.setVariable("guestEmail", data.guestEmail());
		ctx.setVariable("guestPhone", data.guestPhone());
		ctx.setVariable("guestCountryCode", data.guestCountryCode());
		ctx.setVariable("issuedAtDisplay", data.issuedAtDisplay());
		ctx.setVariable("reservationReference", data.reservationReference());
		ctx.setVariable("checkInDisplay", data.checkInDisplay());
		ctx.setVariable("checkOutDisplay", data.checkOutDisplay());
		ctx.setVariable("roomTypeSummary", data.roomTypeSummary());
		ctx.setVariable("cancelledAtDisplay", data.cancelledAtDisplay());
		ctx.setVariable("cancellationReasonLabel", data.cancellationReasonLabel());
		ctx.setVariable("originalAmount", data.originalAmount());
		ctx.setVariable("penaltyAmount", data.penaltyAmount());
		ctx.setVariable("creditedAmount", data.creditedAmount());

		String html = templateEngine.process("invoices/refund-invoice", ctx);
		byte[] pdf = renderPdf(html);
		documentStorage.store(pdf, DocumentGenerationService.creditNoteStorageKey(creditNote.getId()));
		return pdf;
	}

	private byte[] renderPdf(String xhtml) {
		try {
			ByteArrayOutputStream out = new ByteArrayOutputStream();
			PdfRendererBuilder builder = new PdfRendererBuilder();
			builder.useFastMode();
			builder.useUriResolver(DATA_URI_ONLY);
			builder.withHtmlContent(xhtml, "about:blank");
			builder.toStream(out);
			builder.run();
			return out.toByteArray();
		} catch (Exception ex) {
			throw DomainException.unavailable("failed to render document");
		}
	}

	private Map<String, String> asMap(InvoiceDocumentData.LineItem item) {
		Map<String, String> row = new LinkedHashMap<>();
		row.put("description", item.description());
		row.put("quantity", item.quantity());
		row.put("unitPrice", item.unitPrice());
		row.put("totalPrice", item.totalPrice());
		return row;
	}

	private InvoiceDocumentData toDocumentData(Invoice invoice, Reservation reservation, Hotel hotel) {
		String currency = invoice.getCurrencyCode();
		List<InvoiceDocumentData.LineItem> items = invoice.getItems().stream()
				.sorted((a, b) -> Short.compare(a.getSortOrder(), b.getSortOrder()))
				.map(it -> new InvoiceDocumentData.LineItem(it.getDescription(),
						it.getQuantity().stripTrailingZeros().toPlainString(),
						money(it.getUnitPrice(), currency), money(it.getTotalPrice(), currency)))
				.toList();
		boolean hasDiscount = invoice.getDiscountAmount() != null
				&& invoice.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0;
		Guest guest = reservation.getGuest();
		return new InvoiceDocumentData(
				invoice.getInvoiceNumber(),
				resolveLogoDataUri(hotel),
				hotel.getName(),
				hotelAddress(hotel),
				hotel.getPhone(),
				hotel.getEmail(),
				invoice.getBillingName(),
				guest == null ? null : guest.getEmail(),
				guest == null ? null : guest.getPhone(),
				invoice.getBillingCountryCode(),
				DATE_FORMAT.format(invoice.getIssuedAt()),
				reservation.getReference(),
				DAY_FORMAT.format(reservation.getCheckInDate()),
				DAY_FORMAT.format(reservation.getCheckOutDate()),
				nightsDisplay(reservation),
				occupancyDisplay(reservation),
				roomTypeSummary(reservation),
				items,
				money(invoice.getSubtotalAmount(), currency),
				money(invoice.getDiscountAmount(), currency),
				money(invoice.getTaxAmount(), currency),
				money(invoice.getFeeAmount(), currency),
				money(invoice.getTotalAmount(), currency),
				hasDiscount);
	}

	private CreditNoteDocumentData toDocumentData(CreditNote note, Reservation reservation, Hotel hotel) {
		String currency = note.getCurrencyCode();
		Guest guest = reservation.getGuest();
		ReservationCancellation cancellation = reservation.getCancellation();
		String invoiceNumber = invoiceRepository.findById(note.getInvoiceId())
				.map(Invoice::getInvoiceNumber).orElse(null);
		return new CreditNoteDocumentData(
				note.getCreditNoteNumber(),
				invoiceNumber,
				resolveLogoDataUri(hotel),
				hotel.getName(),
				hotelAddress(hotel),
				hotel.getPhone(),
				hotel.getEmail(),
				note.getBillingName(),
				guest == null ? null : guest.getEmail(),
				guest == null ? null : guest.getPhone(),
				guest == null ? null : guest.getCountryCode(),
				DATE_FORMAT.format(note.getIssuedAt()),
				reservation.getReference(),
				DAY_FORMAT.format(reservation.getCheckInDate()),
				DAY_FORMAT.format(reservation.getCheckOutDate()),
				roomTypeSummary(reservation),
				cancellation == null ? null : DATE_FORMAT.format(cancellation.getCancelledAt()),
				cancellationReasonLabel(cancellation),
				money(note.getOriginalAmount(), currency),
				money(note.getPenaltyAmount(), currency),
				money(note.getCreditedAmount(), currency));
	}

	private String cancellationReasonLabel(ReservationCancellation cancellation) {
		if (cancellation == null || cancellation.getCancellationReasonId() == null) {
			return null;
		}
		return cancellationReasonRepository.findById(cancellation.getCancellationReasonId())
				.map(CancellationReason::getLabel).orElse(null);
	}

	/** "3 nights" / "1 night". */
	private String nightsDisplay(Reservation reservation) {
		long nights = java.time.temporal.ChronoUnit.DAYS.between(reservation.getCheckInDate(),
				reservation.getCheckOutDate());
		return nights + (nights == 1 ? " night" : " nights");
	}

	/** "2 adults · 1 child" — omits the children clause when there are none. */
	private String occupancyDisplay(Reservation reservation) {
		int adults = reservation.getAdults() == null ? 0 : reservation.getAdults();
		int children = reservation.getChildren() == null ? 0 : reservation.getChildren();
		StringBuilder sb = new StringBuilder();
		sb.append(adults).append(adults == 1 ? " adult" : " adults");
		if (children > 0) {
			sb.append(" · ").append(children).append(children == 1 ? " child" : " children");
		}
		return sb.toString();
	}

	/** Distinct room type names booked, e.g. "Deluxe Suite, Ocean View Room". */
	private String roomTypeSummary(Reservation reservation) {
		Set<UUID> roomTypeIds = new LinkedHashSet<>();
		for (var line : reservation.getRoomLines()) {
			roomTypeIds.add(line.getRoomTypeId());
		}
		if (roomTypeIds.isEmpty()) {
			return null;
		}
		Map<UUID, String> names = catalog.roomTypeNamesByIds(roomTypeIds);
		return roomTypeIds.stream().map(id -> names.getOrDefault(id, "Room")).distinct()
				.reduce((a, b) -> a + ", " + b).orElse(null);
	}

	/**
	 * Hotel-scoped logo first, platform-scoped fallback (same resolution
	 * order as {@code NotificationServiceImpl#resolveLogoUrl}), read from
	 * disk and inlined as a base64 {@code data:} URI so the PDF renderer
	 * never has to fetch anything over the network — see
	 * {@link #DATA_URI_ONLY}. {@code null} (no logo rendered) if no logo
	 * exists or its bytes are no longer on disk.
	 */
	private String resolveLogoDataUri(Hotel hotel) {
		Media logo = mediaRepository.findByHotelIdAndCategory(hotel.getId(), Media.CATEGORY_LOGO)
				.stream().findFirst().orElse(null);
		if (logo == null && hotel.getPlatformId() != null) {
			logo = mediaRepository.findByPlatformIdAndCategory(hotel.getPlatformId(), Media.CATEGORY_LOGO)
					.stream().findFirst().orElse(null);
		}
		if (logo == null || logo.getStorageKey() == null) {
			return null;
		}
		byte[] bytes = mediaStorage.read(logo.getStorageKey());
		if (bytes == null || bytes.length == 0) {
			return null;
		}
		String mimeType = logo.getMimeType() != null ? logo.getMimeType() : mediaStorage.mimeTypeOf(bytes);
		if (mimeType == null) {
			return null;
		}
		return "data:" + mimeType + ";base64," + Base64.getEncoder().encodeToString(bytes);
	}

	private String hotelAddress(Hotel hotel) {
		StringBuilder sb = new StringBuilder();
		appendPart(sb, hotel.getAddressLine1());
		appendPart(sb, hotel.getAddressLine2());
		appendPart(sb, hotel.getCity());
		return sb.toString();
	}

	private void appendPart(StringBuilder sb, String part) {
		if (part == null || part.isBlank()) {
			return;
		}
		if (sb.length() > 0) {
			sb.append(", ");
		}
		sb.append(part);
	}

	/** Whole-currency-unit display, matching the (now removed) client-side
	 * formatter's convention: "MAD 1,234". */
	private static String money(BigDecimal amount, String currencyCode) {
		BigDecimal value = amount == null ? BigDecimal.ZERO : amount;
		long rounded = value.setScale(0, RoundingMode.HALF_UP).longValueExact();
		return currencyCode + " " + NumberFormat.getIntegerInstance(Locale.US).format(rounded);
	}
}

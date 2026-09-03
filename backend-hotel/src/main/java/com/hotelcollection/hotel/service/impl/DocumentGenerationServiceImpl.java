package com.hotelcollection.hotel.service.impl;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.thymeleaf.ITemplateEngine;
import org.thymeleaf.context.Context;

import com.hotelcollection.hotel.dto.billing.CreditNoteDocumentData;
import com.hotelcollection.hotel.dto.billing.InvoiceDocumentData;
import com.hotelcollection.hotel.entity.CreditNote;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.Invoice;
import com.hotelcollection.hotel.entity.InvoiceItem;
import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.service.BookingService;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.service.DocumentGenerationService;
import com.hotelcollection.hotel.storage.DocumentStorageProvider;

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

	/**
	 * Resource resolution is fully disabled: every referenced URI (image,
	 * stylesheet, font) is rejected rather than fetched. The templates
	 * reference nothing external — this is defense in depth so that no
	 * interpolated value (however it got into the markup) can ever cause an
	 * outbound network or filesystem fetch (XXE/SSRF hardening).
	 */
	private static final FSUriResolver NO_EXTERNAL_RESOURCES = (baseUri, uri) -> null;

	private final ITemplateEngine templateEngine;
	private final DocumentStorageProvider documentStorage;
	private final BookingService booking;
	private final CatalogQueryService catalog;

	public DocumentGenerationServiceImpl(ITemplateEngine templateEngine,
			DocumentStorageProvider documentStorage, BookingService booking,
			CatalogQueryService catalog) {
		this.templateEngine = templateEngine;
		this.documentStorage = documentStorage;
		this.booking = booking;
		this.catalog = catalog;
	}

	@Override
	public byte[] generateInvoicePdf(Invoice invoice) {
		Hotel hotel = hotelFor(invoice.getReservationId());
		InvoiceDocumentData data = toDocumentData(invoice, hotel);
		Context ctx = new Context();
		ctx.setVariable("invoiceNumber", data.invoiceNumber());
		ctx.setVariable("hotelName", data.hotelName());
		ctx.setVariable("hotelAddress", data.hotelAddress());
		ctx.setVariable("hotelPhone", data.hotelPhone());
		ctx.setVariable("hotelEmail", data.hotelEmail());
		ctx.setVariable("billingName", data.billingName());
		ctx.setVariable("issuedAtDisplay", data.issuedAtDisplay());
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
		Hotel hotel = hotelFor(creditNote.getReservationId());
		CreditNoteDocumentData data = toDocumentData(creditNote, hotel);
		Context ctx = new Context();
		ctx.setVariable("creditNoteNumber", data.creditNoteNumber());
		ctx.setVariable("hotelName", data.hotelName());
		ctx.setVariable("hotelAddress", data.hotelAddress());
		ctx.setVariable("hotelPhone", data.hotelPhone());
		ctx.setVariable("hotelEmail", data.hotelEmail());
		ctx.setVariable("billingName", data.billingName());
		ctx.setVariable("issuedAtDisplay", data.issuedAtDisplay());
		ctx.setVariable("originalAmount", data.originalAmount());
		ctx.setVariable("penaltyAmount", data.penaltyAmount());
		ctx.setVariable("creditedAmount", data.creditedAmount());

		String html = templateEngine.process("invoices/refund-invoice", ctx);
		byte[] pdf = renderPdf(html);
		documentStorage.store(pdf, DocumentGenerationService.creditNoteStorageKey(creditNote.getId()));
		return pdf;
	}

	private Hotel hotelFor(UUID reservationId) {
		Reservation reservation = booking.getById(reservationId);
		return catalog.getHotel(reservation.getHotelId());
	}

	private byte[] renderPdf(String xhtml) {
		try {
			ByteArrayOutputStream out = new ByteArrayOutputStream();
			PdfRendererBuilder builder = new PdfRendererBuilder();
			builder.useFastMode();
			builder.useUriResolver(NO_EXTERNAL_RESOURCES);
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

	private InvoiceDocumentData toDocumentData(Invoice invoice, Hotel hotel) {
		String currency = invoice.getCurrencyCode();
		List<InvoiceDocumentData.LineItem> items = invoice.getItems().stream()
				.sorted((a, b) -> Short.compare(a.getSortOrder(), b.getSortOrder()))
				.map(it -> new InvoiceDocumentData.LineItem(it.getDescription(),
						it.getQuantity().stripTrailingZeros().toPlainString(),
						money(it.getUnitPrice(), currency), money(it.getTotalPrice(), currency)))
				.toList();
		boolean hasDiscount = invoice.getDiscountAmount() != null
				&& invoice.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0;
		return new InvoiceDocumentData(
				invoice.getInvoiceNumber(),
				hotel.getName(),
				hotelAddress(hotel),
				hotel.getPhone(),
				hotel.getEmail(),
				invoice.getBillingName(),
				DATE_FORMAT.format(invoice.getIssuedAt()),
				items,
				money(invoice.getSubtotalAmount(), currency),
				money(invoice.getDiscountAmount(), currency),
				money(invoice.getTaxAmount(), currency),
				money(invoice.getFeeAmount(), currency),
				money(invoice.getTotalAmount(), currency),
				hasDiscount);
	}

	private CreditNoteDocumentData toDocumentData(CreditNote note, Hotel hotel) {
		String currency = note.getCurrencyCode();
		return new CreditNoteDocumentData(
				note.getCreditNoteNumber(),
				hotel.getName(),
				hotelAddress(hotel),
				hotel.getPhone(),
				hotel.getEmail(),
				note.getBillingName(),
				DATE_FORMAT.format(note.getIssuedAt()),
				money(note.getOriginalAmount(), currency),
				money(note.getPenaltyAmount(), currency),
				money(note.getCreditedAmount(), currency));
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

package com.hotelcollection.hotel.service.impl;
import com.hotelcollection.hotel.entity.Extra;
import com.hotelcollection.hotel.entity.Room;
import com.hotelcollection.hotel.entity.Guest;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.entity.CreditNote;
import com.hotelcollection.hotel.entity.Invoice;
import com.hotelcollection.hotel.entity.InvoiceItem;
import com.hotelcollection.hotel.entity.ReservationStatus;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.service.InvoiceService;
import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.repository.CreditNoteRepository;
import com.hotelcollection.hotel.repository.InvoiceItemRepository;
import com.hotelcollection.hotel.repository.InvoiceRepository;
import com.hotelcollection.hotel.service.BookingService;

/**
 * Invoice use cases. An invoice is idempotent (one per reservation) and,
 * previously, generated only on demand via {@link #getOrCreateInvoice} — a
 * REST endpoint no frontend ever called, so this table was empty in
 * production. {@link #issueInvoiceForConfirmedReservation} is the new
 * system-triggered path, called from {@code BookingServiceImpl} the moment a
 * reservation reaches {@code confirmed}. Invoice number: INV-<reference>.
 * Line items snapshot room lines, extras, taxes/fees and promo discounts.
 * Reservation data is accessed via {@link BookingService}.
 */
@Service
public class InvoiceServiceImpl implements InvoiceService {

	private final InvoiceRepository invoiceRepository;
	private final InvoiceItemRepository invoiceItemRepository;
	private final CreditNoteRepository creditNoteRepository;
	private final BookingService booking;
	private final CurrentUserAccessor currentUser;

	public InvoiceServiceImpl(InvoiceRepository invoiceRepository,
			InvoiceItemRepository invoiceItemRepository, CreditNoteRepository creditNoteRepository,
			BookingService booking, CurrentUserAccessor currentUser) {
		this.invoiceRepository = invoiceRepository;
		this.invoiceItemRepository = invoiceItemRepository;
		this.creditNoteRepository = creditNoteRepository;
		this.booking = booking;
		this.currentUser = currentUser;
	}

	@Override
	@Transactional
	public Invoice getOrCreateInvoice(String reservationReference, String guestEmail) {
		Reservation reservation = booking.getByReferenceAndEmail(reservationReference, guestEmail);
		return getOrCreate(reservation);
	}

	@Override
	@Transactional
	public Invoice issueInvoiceForConfirmedReservation(UUID reservationId) {
		Reservation reservation = booking.getById(reservationId);
		return getOrCreate(reservation);
	}

	@Override
	@Transactional
	public Invoice getInvoiceForStaff(UUID reservationId) {
		Reservation reservation = booking.getById(reservationId);
		currentUser.requireHotelAccess(reservation.getHotelId());
		return getOrCreate(reservation);
	}

	private Invoice getOrCreate(Reservation reservation) {
		Invoice existing = invoiceRepository.findByReservationId(reservation.getId()).orElse(null);
		if (existing != null) {
			// Already issued — return as-is even if the reservation was
			// cancelled afterwards; that invoice was legitimate when created
			// and remains a real historical record.
			return existing;
		}
		if (reservation.getStatus() == ReservationStatus.cancelled) {
			// Previously ungated: an invoice could be minted for a cancelled,
			// possibly never-charged reservation with no indication it was
			// cancelled (full amount, status "issued", identical in shape to a
			// genuine stay invoice). See docs audit, §F.
			throw DomainException.conflict("cannot issue an invoice for a cancelled reservation");
		}

		Invoice invoice = new Invoice();
		invoice.setReservationId(reservation.getId());
		invoice.setInvoiceNumber("INV-" + reservation.getReference());
		invoice.setGuestId(reservation.getGuestId());
		invoice.setBillingName(guestDisplayName(reservation));
		invoice.setBillingCountryCode(reservation.getGuest() == null ? null
				: reservation.getGuest().getCountryCode());
		invoice.setCurrencyCode(reservation.getCurrencyCode());
		invoice.setSubtotalAmount(reservation.getSubtotalAmount());
		invoice.setDiscountAmount(reservation.getDiscountAmount());
		invoice.setTaxAmount(reservation.getTaxAmount());
		invoice.setFeeAmount(reservation.getFeeAmount());
		invoice.setTotalAmount(reservation.getTotalAmount());
		invoice.setStatus("issued");
		invoice.setIssuedAt(Instant.now());
		invoiceRepository.save(invoice);

		List<InvoiceItem> items = new ArrayList<>();
		int sortOrder = 0;
		for (var line : reservation.getRoomLines()) {
			items.add(item(invoice.getId(), "room", null,
					"Room stay: " + line.getCheckInDate() + " → " + line.getCheckOutDate()
							+ " (" + line.getNights() + " nights)",
					BigDecimal.ONE, line.getSubtotalAmount(), sortOrder++));
		}
		for (var extra : reservation.getExtras()) {
			items.add(item(invoice.getId(), "extra", null,
					"Extra x" + extra.getQuantity(), BigDecimal.valueOf(extra.getQuantity()),
					extra.getTotalPrice(), sortOrder++));
		}
		for (var charge : reservation.getCharges()) {
			items.add(item(invoice.getId(), charge.getChargeType(), null,
					charge.getName(), BigDecimal.ONE, charge.getAmount(), sortOrder++));
		}
		if (reservation.getDiscountAmount() != null
				&& reservation.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
			items.add(item(invoice.getId(), "discount", null, "Promotional discount", BigDecimal.ONE,
					reservation.getDiscountAmount().negate(), sortOrder++));
		}
		invoiceItemRepository.saveAll(items);
		invoice.getItems().addAll(items);
		return invoice;
	}

	@Override
	@Transactional
	public CreditNote issueCreditNoteForCancellation(UUID reservationId, UUID cancellationId,
			BigDecimal penaltyAmount, BigDecimal creditedAmount) {
		Invoice invoice = invoiceRepository.findByReservationId(reservationId).orElse(null);
		if (invoice == null) {
			// Nothing was ever invoiced for this reservation (cancelled before
			// it confirmed) — there is nothing to adjust against.
			return null;
		}
		CreditNote existing = creditNoteRepository.findByReservationId(reservationId).orElse(null);
		if (existing != null) {
			return existing;
		}
		CreditNote note = new CreditNote();
		note.setCreditNoteNumber("CN-" + invoice.getInvoiceNumber().replaceFirst("^INV-", ""));
		note.setInvoiceId(invoice.getId());
		note.setReservationId(reservationId);
		note.setReservationCancellationId(cancellationId);
		note.setGuestId(invoice.getGuestId());
		note.setBillingName(invoice.getBillingName());
		note.setCurrencyCode(invoice.getCurrencyCode());
		note.setOriginalAmount(invoice.getTotalAmount());
		note.setPenaltyAmount(penaltyAmount);
		note.setCreditedAmount(creditedAmount);
		note.setStatus("issued");
		note.setIssuedAt(Instant.now());
		return creditNoteRepository.save(note);
	}

	@Override
	@Transactional(readOnly = true)
	public CreditNote getCreditNote(String reservationReference, String guestEmail) {
		Reservation reservation = booking.getByReferenceAndEmail(reservationReference, guestEmail);
		return creditNoteRepository.findByReservationId(reservation.getId())
				.orElseThrow(() -> DomainException.notFound("no credit note exists for this reservation"));
	}

	@Override
	@Transactional(readOnly = true)
	public CreditNote getCreditNoteForStaff(UUID reservationId) {
		Reservation reservation = booking.getById(reservationId);
		currentUser.requireHotelAccess(reservation.getHotelId());
		return creditNoteRepository.findByReservationId(reservationId)
				.orElseThrow(() -> DomainException.notFound("no credit note exists for this reservation"));
	}

	private String guestDisplayName(Reservation reservation) {
		if (reservation.getGuest() == null) {
			return "Guest";
		}
		return (reservation.getGuest().getFirstName() + " " + reservation.getGuest().getLastName()).trim();
	}

	private InvoiceItem item(UUID invoiceId, String type, String refId, String description,
			BigDecimal quantity, BigDecimal amount, int sortOrder) {
		InvoiceItem it = new InvoiceItem();
		it.setInvoiceId(invoiceId);
		it.setItemType(type);
		it.setDescription(description);
		it.setQuantity(quantity);
		it.setUnitPrice(amount.divide(quantity, 2, java.math.RoundingMode.HALF_UP));
		it.setTotalPrice(amount);
		it.setSortOrder((short) sortOrder);
		return it;
	}
}
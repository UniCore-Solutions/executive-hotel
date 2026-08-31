package com.hotelcollection.hotel.service.impl;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.service.BookingService;
import com.hotelcollection.hotel.dto.reservation.CancelReservationInput;
import com.hotelcollection.hotel.dto.reservation.CreateReservationInput;
import com.hotelcollection.hotel.dto.reservation.CreateResult;
import com.hotelcollection.hotel.dto.reservation.ExtraInput;
import com.hotelcollection.hotel.dto.reservation.GuestInput;
import com.hotelcollection.hotel.dto.PageInput;
import com.hotelcollection.hotel.dto.rate.Quote;
import com.hotelcollection.hotel.dto.rate.QuoteInput;
import com.hotelcollection.hotel.dto.rate.QuoteLineInput;
import com.hotelcollection.hotel.dto.rate.CancellationEvaluation;
import com.hotelcollection.hotel.service.PricingService;
import com.hotelcollection.hotel.dto.reservation.ReservationPageResult;
import com.hotelcollection.hotel.dto.reservation.RoomInput;
import com.hotelcollection.hotel.service.InventoryService;
import com.hotelcollection.hotel.entity.CancellationReason;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.entity.Guest;
import com.hotelcollection.hotel.util.ReferenceGenerator;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.util.MoneyUtil;
import com.hotelcollection.hotel.entity.PaymentStatus;
import com.hotelcollection.hotel.entity.RatePlan;
import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.entity.ReservationCancellation;
import com.hotelcollection.hotel.entity.ReservationCharge;
import com.hotelcollection.hotel.entity.ReservationExtra;
import com.hotelcollection.hotel.entity.ReservationRoom;
import com.hotelcollection.hotel.entity.ReservationStatus;
import com.hotelcollection.hotel.entity.ReservationStatusHistory;
import com.hotelcollection.hotel.service.EventPublisher;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.repository.CancellationReasonRepository;
import com.hotelcollection.hotel.repository.GuestRepository;
import com.hotelcollection.hotel.service.GuestProvisioningService;
import com.hotelcollection.hotel.service.RateQueryService;
import com.hotelcollection.hotel.repository.ReservationCancellationRepository;
import com.hotelcollection.hotel.repository.ReservationRepository;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.util.Validation;
import com.hotelcollection.hotel.dto.rate.QuoteExtraInput;
import com.hotelcollection.hotel.dto.rate.QuoteLine;

/**
 * Reservation use cases: create (idempotent by idempotency_key, server-side
 * pricing snapshot from {@link PricingService#quote}, availability locked
 * and sold in the same transaction, booking.confirmed outbox event),
 * lookup, cancel (penalty rule + inventory release + booking.cancelled
 * event; account-backed bookings can only be cancelled by their owner).
 * Cross-service data (hotel, room types, pricing, inventory) is accessed
 * via the respective services.
 */
@Service
public class BookingServiceImpl implements BookingService {

	private final ReservationRepository reservationRepository;
	private final ReservationCancellationRepository cancellationRepository;
	private final GuestRepository guestRepository;
	private final CatalogQueryService catalog;
	private final PricingService pricing;
	private final RateQueryService rate;
	private final InventoryService inventory;
	private final EventPublisher eventPublisher;
	private final CurrentUserAccessor currentUser;
	private final CancellationReasonRepository cancellationReasonRepository;
	private final GuestProvisioningService guestProvisioning;

	// Field injection (not a constructor parameter): service/impl classes are
	// capped at 11 constructor parameters by ModuleArchitectureTest, and this
	// class is already at that cap.
	@org.springframework.beans.factory.annotation.Value("${app.reservations.hold-minutes:15}")
	private long holdMinutes;

	public BookingServiceImpl(ReservationRepository reservationRepository,
			ReservationCancellationRepository cancellationRepository,
			GuestRepository guestRepository,
			@Lazy CatalogQueryService catalog, PricingService pricing, RateQueryService rate,
			InventoryService inventory,
			EventPublisher eventPublisher, CurrentUserAccessor currentUser,
			CancellationReasonRepository cancellationReasonRepository,
			GuestProvisioningService guestProvisioning) {
		this.reservationRepository = reservationRepository;
		this.cancellationRepository = cancellationRepository;
		this.guestRepository = guestRepository;
		this.catalog = catalog;
		this.pricing = pricing;
		this.rate = rate;
		this.inventory = inventory;
		this.eventPublisher = eventPublisher;
		this.currentUser = currentUser;
		this.cancellationReasonRepository = cancellationReasonRepository;
		this.guestProvisioning = guestProvisioning;
	}

	@Override
	@Transactional
	public CreateResult create(CreateReservationInput in) {
		if (in.idempotencyKey() == null || in.idempotencyKey().isBlank()) {
			throw DomainException.validation("idempotencyKey is required");
		}
		Optional<Reservation> existing = reservationRepository.findByIdempotencyKey(in.idempotencyKey());
		if (existing.isPresent()) {
			return new CreateResult(existing.get(), false);
		}

		validateInput(in);

		Hotel hotel = catalog.getHotel(in.hotelId());
		if (!"active".equals(hotel.getStatus())) {
			throw DomainException.conflict("hotel is not bookable");
		}
		int nights = (int) ChronoUnit.DAYS.between(in.checkInDate(), in.checkOutDate());

		// ---- room capacity (room type level) ----
		Map<UUID, RoomType> byId = catalog.roomTypesByIds(
				in.rooms().stream().map(RoomInput::roomTypeId).toList());
		for (RoomInput room : in.rooms()) {
			RoomType roomType = byId.get(room.roomTypeId());
			if (roomType == null || !roomType.getHotelId().equals(in.hotelId())) {
				throw DomainException.validation("room type not found for this hotel");
			}
			if (in.adults() > roomType.getMaxAdults() || in.children() > roomType.getMaxChildren()) {
				throw DomainException.validation("room type " + roomType.getName()
						+ " cannot accommodate the party size");
			}
		}

		// ---- server-side pricing snapshot (never trusts client totals) ----
		Quote quote = pricing.quote(new QuoteInput(in.hotelId(), in.checkInDate(),
				in.checkOutDate(), in.adults(), in.children(), in.currencyCode(),
				in.rooms().stream().map(r -> new QuoteLineInput(r.roomTypeId(), r.ratePlanId())).toList(),
				in.extras() == null ? List.of() : in.extras().stream()
						.map(e -> new com.hotelcollection.hotel.dto.rate.QuoteExtraInput(e.extraId(),
								e.quantity())).toList(),
				in.promoCode()));

		List<ReservationRoom> lines = new ArrayList<>();
		for (com.hotelcollection.hotel.dto.rate.QuoteLine line : quote.lines()) {
			ReservationRoom rl = new ReservationRoom();
			rl.setRoomTypeId(line.roomTypeId());
			rl.setRatePlanId(line.ratePlanId());
			rl.setHotelId(in.hotelId());
			rl.setCheckInDate(in.checkInDate());
			rl.setCheckOutDate(in.checkOutDate());
			rl.setNights((short) line.nights());
			rl.setRatePerNight(line.ratePerNight());
			rl.setSubtotalAmount(line.subtotalAmount());
			rl.setStatus("active");
			lines.add(rl);
		}

		// ---- availability: lock + sell per night ----
		inventory.lockAndSell(in.hotelId(),
				lines.stream()
						.map(l -> new InventoryService.InventoryRequirement(l.getRoomTypeId(), 1))
						.toList(),
				in.checkInDate(), nights);

		// ---- guest ----
		Guest guest = findOrCreateGuest(in.guest());

		// ---- aggregate ----
		Reservation reservation = new Reservation();
		reservation.setReference(uniqueReference());
		reservation.setIdempotencyKey(in.idempotencyKey());
		reservation.setHotelId(in.hotelId());
		reservation.setGuestId(guest.getId());
		// The guest relationship is a read-only mapping (insertable=false,
		// updatable=false) hydrated from guest_id on LOAD — a freshly created
		// entity is not loaded, so populate it explicitly or the GraphQL
		// guest field resolves to null (schema: Reservation.guest is non-null).
		reservation.setGuest(guest);
		CurrentUser actor = currentUser.currentUser().orElse(null);
		reservation.setBookedByUserId(actor == null ? null : actor.userId());
		// Payment hold: the reservation sells inventory immediately (the
		// per-night row lock above is what actually prevents overselling) but
		// stays 'pending' — not 'confirmed' — until payment captures. The
		// hold-expiry job (BookingServiceImpl#expireHold) releases it if that
		// never happens within holdExpiresAt.
		reservation.setStatus(ReservationStatus.pending);
		reservation.setHoldExpiresAt(Instant.now().plus(holdMinutes, ChronoUnit.MINUTES));
		reservation.setCheckInDate(in.checkInDate());
		reservation.setCheckOutDate(in.checkOutDate());
		reservation.setAdults((short) in.adults());
		reservation.setChildren((short) in.children());
		reservation.setCurrencyCode(in.currencyCode());
		reservation.setSubtotalAmount(quote.subtotalAmount());
		reservation.setDiscountAmount(quote.discountAmount());
		reservation.setTaxAmount(quote.taxAmount());
		reservation.setFeeAmount(quote.feeAmount());
		reservation.setTotalAmount(quote.totalAmount());
		reservation.setPaymentStatus(PaymentStatus.pending);
		reservation.setSource("direct");
		reservation.setNotes(null);
		reservation.setArrivalSlot(blankToNull(in.arrivalSlot()));
		reservation.setSpecialRequests(blankToNull(in.specialRequests()));
		reservation.setCreatedAt(Instant.now());
		reservation.setUpdatedAt(Instant.now());

		// Save first so the identity id exists; then attach children (their
		// reservation_id columns are plain fields, not mapped relationships).
		try {
			reservationRepository.save(reservation);
		} catch (DataIntegrityViolationException ex) {
			// idempotency key raced with a concurrent create — return the winner
			Optional<Reservation> winner = reservationRepository.findByIdempotencyKey(in.idempotencyKey());
			if (winner.isPresent()) {
				return new CreateResult(winner.get(), false);
			}
			throw ex;
		}

		lines.forEach(l -> {
			l.setReservationId(reservation.getId());
			reservation.getRoomLines().add(l);
		});

		// extras + charges: exactly the lines the quote priced (snapshots)
		for (var extra : quote.extras()) {
			ReservationExtra re = new ReservationExtra();
			re.setReservationId(reservation.getId());
			re.setHotelId(in.hotelId());
			re.setExtraId(extra.extraId());
			re.setQuantity(extra.quantity());
			re.setUnitPrice(extra.unitPrice());
			re.setTotalPrice(extra.totalPrice());
			if (extra.perNight()) {
				re.setStayDate(in.checkInDate());
			}
			reservation.getExtras().add(re);
		}

		for (var charge : quote.charges()) {
			ReservationCharge rc = new ReservationCharge();
			rc.setReservationId(reservation.getId());
			rc.setTaxFeeTypeId(charge.taxFeeTypeId());
			rc.setChargeType(charge.chargeType());
			rc.setName(charge.name());
			rc.setAmount(charge.amount());
			rc.setCreatedAt(Instant.now());
			reservation.getCharges().add(rc);
		}

		ReservationStatusHistory history = new ReservationStatusHistory();
		history.setReservationId(reservation.getId());
		history.setFromStatus(null);
		history.setToStatus(ReservationStatus.pending);
		history.setChangedByUserId(actor == null ? null : actor.userId());
		history.setChangedAt(Instant.now());
		reservation.getStatusHistory().add(history);

		reservationRepository.save(reservation);

		// Not 'booking.confirmed' — the reservation is only a payment hold at
		// this point. That event fires from markFullyPaid() once payment
		// actually captures and the status is promoted to confirmed.
		eventPublisher.publish("booking.created", 1, in.hotelId(),
				"reservation:" + reservation.getReference(),
				Map.of(
						"reference", reservation.getReference(),
						"hotelId", in.hotelId(),
						"guestEmail", guest.getEmail() == null ? "" : guest.getEmail(),
						"checkInDate", in.checkInDate().toString(),
						"checkOutDate", in.checkOutDate().toString(),
						"adults", in.adults(),
						"children", in.children(),
						"currencyCode", in.currencyCode(),
						"totalAmount", quote.totalAmount(),
						"roomLines", lines.stream().map(l -> Map.of(
								"roomTypeId", l.getRoomTypeId(),
								"ratePlanId", l.getRatePlanId(),
								"nights", l.getNights(),
								"ratePerNight", l.getRatePerNight())).toList()),
				actor == null ? null : "user:" + actor.userId());
		return new CreateResult(reservation, true);
	}

	private void validateInput(CreateReservationInput in) {
		Validation.requireNotBlank(in.currencyCode(), "currencyCode");
		Validation.requireNotBlank(in.idempotencyKey(), "idempotencyKey");
		Validation.requirePositive(in.adults(), "adults");
		if (in.children() < 0) {
			throw DomainException.validation("children cannot be negative");
		}
		if (in.rooms() == null || in.rooms().isEmpty()) {
			throw DomainException.validation("at least one room is required");
		}
		for (RoomInput room : in.rooms()) {
			Validation.requireNotBlank(String.valueOf(room.roomTypeId()), "roomTypeId");
			Validation.requireNotBlank(String.valueOf(room.ratePlanId()), "ratePlanId");
		}
		if (in.extras() != null) {
			for (ExtraInput extra : in.extras()) {
				Validation.requirePositive(extra.quantity(), "extra quantity");
			}
		}
		GuestInput guest = in.guest();
		Validation.requireNotBlank(guest.firstName(), "guest.firstName");
		Validation.requireNotBlank(guest.lastName(), "guest.lastName");
		Validation.requireEmail(guest.email());
	}

	private String uniqueReference() {
		for (int i = 0; i < 5; i++) {
			String ref = ReferenceGenerator.newReference();
			if (reservationRepository.findByReferenceWithLines(ref).isEmpty()) {
				return ref;
			}
		}
		throw DomainException.conflict("could not allocate a reservation reference, retry");
	}

	private static String blankToNull(String v) {
		return v == null || v.isBlank() ? null : v.trim();
	}

	private Guest findOrCreateGuest(GuestInput in) {
		Guest guest;
		if (in.email() != null && !in.email().isBlank()) {
			guest = guestRepository.findByEmailIgnoreCase(in.email().trim()).stream()
					.findFirst().orElseGet(() -> createGuest(in));
		} else {
			guest = createGuest(in);
		}
		// Silent account provisioning: every booking email gets a passwordless
		// 'provisioned' user account linked to this guest (created if missing,
		// linked if the email already has one). A later registration with the
		// same email completes the account and this booking appears under
		// "My bookings" (guests.user_id drives myReservations).
		guestProvisioning.ensureAccount(guest);
		return guest;
	}

	private Guest createGuest(GuestInput in) {
		Guest guest = new Guest();
		guest.setFirstName(in.firstName());
		guest.setLastName(in.lastName());
		guest.setEmail(in.email() == null ? null : in.email().trim().toLowerCase());
		guest.setPhone(in.phone());
		guest.setCountryCode(in.countryCode());
		guest.setCreatedAt(Instant.now());
		guest.setUpdatedAt(Instant.now());
		return guestRepository.save(guest);
	}

	// ---------------------------------------------------------------- lookup

	@Override
	@Transactional(readOnly = true)
	public Reservation getByReferenceAndEmail(String reference, String email) {
		return reservationRepository.findByReferenceAndGuestEmailWithLines(reference, email)
				.orElseThrow(() -> DomainException.notFound(
						"No reservation found for those details. Check the reference and the email used at booking."));
	}

	@Override
	@Transactional(readOnly = true)
	public Reservation getByReference(String reference) {
		return reservationRepository.findByReferenceWithLines(reference)
				.orElseThrow(() -> DomainException.notFound("reservation not found"));
	}

	@Override
	@Transactional(readOnly = true)
	public Reservation getById(UUID id) {
		return reservationRepository.findById(id)
				.orElseThrow(() -> DomainException.notFound("reservation not found"));
	}

	@Override
	@Transactional
	public Reservation getByIdForUpdate(UUID id) {
		return reservationRepository.findByIdForUpdate(id)
				.orElseThrow(() -> DomainException.notFound("reservation not found"));
	}

	/** Admin back-office listing: hotel-scoped (staff access enforced). */
	@Override
	@Transactional(readOnly = true)
	public ReservationPageResult adminReservations(UUID hotelId,
			ReservationStatus status, PageInput page) {
		requireStaffAccess(hotelId);
		int p = page == null || page.page() == null ? 0 : Math.max(page.page(), 0);
		int s = page == null || page.size() == null ? 20 : Math.min(Math.max(page.size(), 1), 100);
		Page<Reservation> result = reservationRepository.searchByHotel(hotelId, status,
				PageRequest.of(p, s));
		return new ReservationPageResult(result.getTotalElements(), result.getNumber(),
				result.getSize(), result.getContent());
	}

	@Override
	@Transactional(readOnly = true)
	public List<Reservation> myReservations() {
		CurrentUser user = currentUser.require();
		Guest guest = guestRepository.findByUserId(user.userId()).orElse(null);
		if (guest == null) {
			return List.of();
		}
		return reservationRepository.findByGuestIdWithLines(guest.getId());
	}

	@Override
	@Transactional(readOnly = true)
	public String cancellationReasonLabel(UUID id) {
		if (id == null) {
			return null;
		}
		return cancellationReasonRepository.findById(id)
				.map(CancellationReason::getLabel).orElse(null);
	}

	@Override
	@Transactional(readOnly = true)
	public boolean hasCompletedStayAt(UUID hotelId, UUID userId) {
		return reservationRepository.existsByHotelIdAndBookedByUserIdAndStatus(hotelId, userId,
				ReservationStatus.checked_out);
	}

	@Override
	@Transactional
	public Reservation markFullyPaid(UUID reservationId) {
		Reservation reservation = reservationRepository.findById(reservationId)
				.orElseThrow(() -> DomainException.notFound("reservation not found"));
		reservation.setPaymentStatus(PaymentStatus.captured);
		if (reservation.getStatus() == ReservationStatus.pending) {
			ReservationStatus from = reservation.getStatus();
			reservation.setStatus(ReservationStatus.confirmed);
			reservation.setHoldExpiresAt(null);
			ReservationStatusHistory history = new ReservationStatusHistory();
			history.setReservationId(reservation.getId());
			history.setFromStatus(from);
			history.setToStatus(ReservationStatus.confirmed);
			history.setChangedAt(Instant.now());
			reservation.getStatusHistory().add(history);
			eventPublisher.publish("booking.confirmed", 1, reservation.getHotelId(),
					"reservation:" + reservation.getReference(),
					Map.of("reference", reservation.getReference(), "hotelId", reservation.getHotelId(),
							"totalAmount", reservation.getTotalAmount()),
					null);
		}
		reservation.setUpdatedAt(Instant.now());
		return reservationRepository.save(reservation);
	}

	// ---------------------------------------------------------------- hold expiry

	@Override
	@Transactional(readOnly = true)
	public List<UUID> findExpiredHoldIds() {
		return reservationRepository.findExpiredHoldIds(Instant.now());
	}

	@Override
	@Transactional
	public void expireHold(UUID reservationId) {
		Reservation reservation = reservationRepository.findByIdForUpdate(reservationId).orElse(null);
		if (reservation == null || reservation.getStatus() != ReservationStatus.pending
				|| reservation.getHoldExpiresAt() == null
				|| reservation.getHoldExpiresAt().isAfter(Instant.now())) {
			// Resolved concurrently since the candidate scan (captured,
			// cancelled, or the hold was otherwise extended) — nothing to do.
			// Re-checked under the same row lock createPayment/capture take,
			// so this can never race a payment that lands at the same instant.
			return;
		}
		doCancel(reservation, null, "payment_timeout",
				"Automatically released — payment was not completed before the hold expired.");
	}

	// ---------------------------------------------------------------- cancel

	@Override
	@Transactional
	public Reservation cancel(CancelReservationInput in) {
		Reservation reservation = getByReferenceAndEmail(in.reference(), in.email());
		// account-backed bookings can only be cancelled by their owner;
		// accountless bookings keep the reference+email self-service flow
		CurrentUser actor = currentUser.currentUser().orElse(null);
		if (reservation.getBookedByUserId() != null
				&& (actor == null || !reservation.getBookedByUserId().equals(actor.userId()))) {
			throw DomainException.forbidden(
					"this reservation belongs to an account; sign in to cancel it");
		}
		return doCancel(reservation, actor, in.reasonCode(), in.reasonNote());
	}

	/**
	 * Back-office cancellation: staff of the reservation's hotel (checked
	 * here) may cancel any reservation of that hotel, including
	 * account-backed ones. Status guards are identical to self-service.
	 */
	@Override
	@Transactional
	public Reservation adminCancel(UUID reservationId, String reasonCode, String reasonNote) {
		CurrentUser actor = currentUser.require();
		Reservation reservation = reservationRepository.findByIdWithLines(reservationId)
				.orElseThrow(() -> DomainException.notFound("reservation not found"));
		requireStaffAccess(reservation.getHotelId());
		return doCancel(reservation, actor, reasonCode, reasonNote);
	}

	private Reservation doCancel(Reservation reservation, CurrentUser actor, String reasonCode,
			String reasonNote) {
		if (reservation.getStatus() == ReservationStatus.cancelled) {
			throw DomainException.conflict("reservation is already cancelled");
		}
		if (reservation.getStatus() == ReservationStatus.checked_in
				|| reservation.getStatus() == ReservationStatus.checked_out) {
			throw DomainException.conflict("in-house reservations cannot be cancelled via self-service");
		}

		BigDecimal penalty = MoneyUtil.ZERO;
		boolean refundable = true;
		// evaluate per room line using its rate plan
		for (ReservationRoom line : reservation.getRoomLines()) {
			RatePlan plan = rate.ratePlanById(line.getRatePlanId());
			if (plan == null) {
				// plan deleted after booking: fall back to full penalty-free policy
				continue;
			}
			CancellationEvaluation eval = pricing.evaluateCancellation(plan,
					line.getSubtotalAmount(), line.getRatePerNight(),
					reservation.getCheckInDate());
			penalty = penalty.add(eval.penaltyAmount());
			refundable = refundable && eval.isRefundable();
		}

		ReservationStatus fromStatus = reservation.getStatus();
		ReservationCancellation cancellation = new ReservationCancellation();
		cancellation.setReservation(reservation);
		if (reasonCode != null && !reasonCode.isBlank()) {
			cancellation.setCancellationReasonId(cancellationReasonRepository.findByCode(reasonCode.trim())
					.map(CancellationReason::getId).orElse(null));
		}
		cancellation.setReasonNote(reasonNote);
		cancellation.setCancelledByUserId(actor == null ? null : actor.userId());
		cancellation.setRefundable(refundable);
		cancellation.setPenaltyAmount(penalty);
		cancellation.setRefundAmount(reservation.getTotalAmount().subtract(penalty).max(MoneyUtil.ZERO));
		cancellation.setCancelledAt(Instant.now());
		try {
			// saveAndFlush surfaces the unique (reservation_id) violation NOW so
			// a concurrent double-cancel resolves to a clean CONFLICT instead of
			// an opaque DataIntegrityViolation at commit time.
			cancellationRepository.saveAndFlush(cancellation);
		} catch (DataIntegrityViolationException ex) {
			throw DomainException.conflict("reservation is already cancelled");
		}
		reservation.setCancellation(cancellation);

		reservation.setStatus(ReservationStatus.cancelled);
		reservation.setUpdatedAt(Instant.now());
		ReservationStatusHistory history = new ReservationStatusHistory();
		history.setReservationId(reservation.getId());
		history.setFromStatus(fromStatus);
		history.setToStatus(ReservationStatus.cancelled);
		history.setChangedByUserId(actor == null ? null : actor.userId());
		history.setNote(reasonNote);
		history.setChangedAt(Instant.now());
		reservation.getStatusHistory().add(history);
		reservationRepository.save(reservation);

		inventory.release(reservation.getHotelId(),
				reservation.getRoomLines().stream()
						.map(l -> new InventoryService.InventoryRequirement(l.getRoomTypeId(), 1))
						.toList(),
				reservation.getCheckInDate(),
				(int) ChronoUnit.DAYS.between(reservation.getCheckInDate(), reservation.getCheckOutDate()));

		eventPublisher.publish("booking.cancelled", 1, reservation.getHotelId(),
				"reservation:" + reservation.getReference(),
				Map.of(
						"reference", reservation.getReference(),
						"hotelId", reservation.getHotelId(),
						"penaltyAmount", penalty,
						"refundAmount", cancellation.getRefundAmount(),
						"currencyCode", reservation.getCurrencyCode()),
				actor == null ? null : "user:" + actor.userId());
		return reservation;
	}

	private void requireStaffAccess(UUID hotelId) {
		CurrentUser actor = currentUser.require();
		if (!actor.hasRole("super_admin") && !actor.inHotel(hotelId)) {
			throw DomainException.forbidden("no access to this hotel");
		}
	}
}
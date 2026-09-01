package com.hotelcollection.hotel.service.impl;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.hotelcollection.hotel.entity.Payment;
import com.hotelcollection.hotel.entity.PaymentStatus;
import com.hotelcollection.hotel.entity.PaymentTransaction;
import com.hotelcollection.hotel.dto.billing.CapturePaymentInput;
import com.hotelcollection.hotel.dto.billing.CreatePaymentInput;
import com.hotelcollection.hotel.service.PaymentService;
import com.hotelcollection.hotel.service.EventPublisher;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.repository.PaymentRepository;
import com.hotelcollection.hotel.service.BookingService;
import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.entity.ReservationStatus;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.util.Validation;

/**
 * Payment use cases. Payments are always against a reservation; the amount
 * is server-validated to match the reservation's remaining balance (the
 * client never decides the amount). The payment gateway is out of scope: a
 * payment is created {@code pending} and, moments later, a scheduled mock
 * "provider" ({@link #scheduleSimulatedSettlement}) asynchronously delivers a
 * {@link #processProviderEvent} outcome — {@code captured} or {@code failed}
 * — the same way {@link #capture} does for a direct/manual settlement.
 * Overpayment is rejected. Provider-level idempotency is enforced by the
 * partial unique index on (provider, provider_reference) (C17) — a duplicate
 * capture or provider event reuses the existing payment.
 *
 * <p>Request-level idempotency (V23): {@code createPayment} takes a client
 * idempotency key, mirroring {@code reservations.idempotency_key} — a
 * retried request with the same key resolves to the same payment row rather
 * than creating a duplicate. Independently, at most one payment may be
 * {@code pending} per reservation at a time (also DB-enforced, V23): the
 * balance check alone (summing only {@code captured} payments) cannot
 * prevent two independent, individually-valid {@code createPayment} calls
 * from both succeeding while neither is yet captured — the partial unique
 * index on {@code (reservation_id) WHERE status = 'pending'} makes that
 * impossible regardless of key equality.
 *
 * <p>Authorization (audit): payments are money-affecting operations.
 * {@code create}/{@code capture} allow either an authenticated caller who is
 * the reservation owner (bookedByUserId) or hotel staff of the reservation's
 * hotel (super_admin / hotel member), or — for an accountless reservation
 * ({@code bookedByUserId} null) — a caller who supplies the guest email on
 * file, mirroring the reference+email proof-of-possession already used by
 * self-service reservation lookup/cancel ({@link BookingService}). Account-
 * backed reservations are never reachable via the guest-email path.
 *
 * <p>Reservation data (read + status updates) is accessed via
 * {@link BookingService}; no other-layer repository access.
 */
@Service
public class PaymentServiceImpl implements PaymentService {

	private static final Logger log = LoggerFactory.getLogger(PaymentServiceImpl.class);

	private final PaymentRepository paymentRepository;
	private final BookingService booking;
	private final EventPublisher eventPublisher;
	private final CurrentUserAccessor currentUser;
	private final TaskScheduler scheduler;
	private final long settlementDelayMinMs;
	private final long settlementDelayMaxMs;
	/** When false, a plain guest checkout (no explicit {@code simulateOutcome})
	 * never auto-resolves — the payment sits {@code pending} until someone
	 * manually settles it via the webhook or the admin trigger. An explicit
	 * {@code simulateOutcome} (QA/Postman) always still works either way. */
	private final boolean autoSettleEnabled;
	// The proxied bean, not `this` — the scheduled callback runs on a
	// different thread as a plain method call, so invoking processProviderEvent
	// via `this` would bypass Spring's @Transactional proxy entirely (a classic
	// self-invocation gotcha) and OutboxEventPublisher's MANDATORY-propagation
	// publish() would fail with "no existing transaction". @Lazy breaks the
	// circular self-reference at construction time.
	private final PaymentService self;

	public PaymentServiceImpl(PaymentRepository paymentRepository, BookingService booking,
			EventPublisher eventPublisher, CurrentUserAccessor currentUser,
			TaskScheduler paymentSimulationScheduler,
			@Value("${app.payments.simulated-settlement-delay-min-ms:1500}") long settlementDelayMinMs,
			@Value("${app.payments.simulated-settlement-delay-max-ms:4000}") long settlementDelayMaxMs,
			@Value("${app.payments.auto-settle-enabled:false}") boolean autoSettleEnabled,
			@org.springframework.context.annotation.Lazy PaymentService self) {
		this.paymentRepository = paymentRepository;
		this.booking = booking;
		this.eventPublisher = eventPublisher;
		this.currentUser = currentUser;
		this.scheduler = paymentSimulationScheduler;
		this.settlementDelayMinMs = settlementDelayMinMs;
		this.settlementDelayMaxMs = settlementDelayMaxMs;
		this.autoSettleEnabled = autoSettleEnabled;
		this.self = self;
	}

	@Override
	@Transactional
	public Payment createPayment(CreatePaymentInput in) {
		Validation.requirePositive(in.amount(), "amount");
		Validation.requireNotBlank(in.currencyCode(), "currencyCode");
		Validation.requireNotBlank(in.provider(), "provider");
		if (in.idempotencyKey() == null || in.idempotencyKey().isBlank()) {
			throw DomainException.validation("idempotencyKey is required");
		}

		// A retry with the same key is the same logical attempt: short-circuit
		// before touching the reservation lock or re-running any check below.
		Optional<Payment> existing = paymentRepository.findByIdempotencyKey(in.idempotencyKey());
		if (existing.isPresent()) {
			return existing.get();
		}

		Reservation reservation = booking.getByIdForUpdate(in.reservationId());
		ensurePaymentAccess(reservation, in.guestEmail());
		if (reservation.getStatus() == ReservationStatus.cancelled) {
			throw DomainException.conflict("cannot pay for a cancelled reservation");
		}
		// V23: at most one payment may be in flight per reservation. The balance
		// check below only ever considered CAPTURED amounts, so two independent
		// (not necessarily concurrent — simply sequential, neither yet captured)
		// createPayment calls could otherwise both pass it and both later capture,
		// overcharging the guest. The reservation row lock held since
		// getByIdForUpdate() above already serializes this check against any other
		// createPayment/capture call on the same reservation.
		boolean hasPendingPayment = paymentRepository.findByReservationId(reservation.getId()).stream()
				.anyMatch(p -> p.getStatus() == PaymentStatus.pending);
		if (hasPendingPayment) {
			throw DomainException.conflict("a payment is already being processed for this reservation");
		}
		BigDecimal balance = reservation.getTotalAmount().subtract(paidAmount(reservation.getId()));
		if (in.amount().compareTo(balance) > 0) {
			throw DomainException.validation(
					"amount exceeds the remaining balance of " + balance + " " + in.currencyCode());
		}
		if (!in.currencyCode().equals(reservation.getCurrencyCode())) {
			throw DomainException.validation("currency does not match the reservation currency");
		}

		Payment payment = new Payment();
		payment.setReservationId(reservation.getId());
		payment.setAmount(in.amount());
		payment.setCurrencyCode(in.currencyCode());
		payment.setStatus(PaymentStatus.pending);
		payment.setProvider(in.provider());
		payment.setIdempotencyKey(in.idempotencyKey());
		payment.setCreatedAt(Instant.now());
		payment.setUpdatedAt(Instant.now());

		PaymentTransaction transaction = new PaymentTransaction();
		transaction.setPaymentId(payment.getId());
		transaction.setTransactionType("authorization");
		transaction.setAmount(in.amount());
		transaction.setStatus("pending");
		transaction.setProviderTransactionId(null);
		transaction.setCreatedAt(Instant.now());
		payment.getTransactions().add(transaction);

		try {
			// saveAndFlush surfaces either unique-index violation (idempotency key
			// or the pending-per-reservation invariant) NOW, inside this catch,
			// rather than as an opaque DataIntegrityViolation at commit time —
			// same idiom already used for the reservation-cancellation race
			// (BookingServiceImpl#doCancel).
			paymentRepository.saveAndFlush(payment);
		} catch (DataIntegrityViolationException ex) {
			Optional<Payment> winner = paymentRepository.findByIdempotencyKey(in.idempotencyKey());
			if (winner.isPresent()) {
				return winner.get();
			}
			throw DomainException.conflict("a payment is already being processed for this reservation");
		}

		eventPublisher.publish("payment.created", 1, reservation.getHotelId(),
				"payment:" + payment.getId(),
				Map.of(
						"paymentId", payment.getId(),
						"reservationReference", reservation.getReference(),
						"amount", in.amount(),
						"currencyCode", in.currencyCode(),
						"provider", in.provider()),
				null);

		scheduleSimulatedSettlement(payment.getId(), in.provider(), in.simulateOutcome());
		return payment;
	}

	/**
	 * Schedules the mock provider's asynchronous callback — but only for the
	 * {@code "card"} provider the guest checkout uses. A payment recorded
	 * under any other provider (e.g. staff entering an offline/manual
	 * settlement) is assumed to be explicitly captured by whoever created it,
	 * exactly like every existing manual-capture test and workflow already
	 * does; auto-simulating those would race an explicit {@link #capture}
	 * call for no product reason. Registered to fire only {@code afterCommit}
	 * so the scheduled task never races the still-open transaction that
	 * inserted the payment row (it runs on a different thread, possibly
	 * before this method even returns). {@code "timeout"} schedules nothing
	 * at all, deliberately leaving the payment {@code pending} forever so
	 * callers can exercise their own timeout handling on demand.
	 */
	private void scheduleSimulatedSettlement(UUID paymentId, String provider, String simulateOutcome) {
		if (!"card".equals(provider)) {
			return;
		}
		boolean explicit = simulateOutcome != null && !simulateOutcome.isBlank();
		if (!explicit && !autoSettleEnabled) {
			// No outcome was requested and auto-settle is switched off: behave
			// exactly like an explicit "timeout" for the plain guest checkout —
			// nothing fires until a human settles it manually.
			return;
		}
		String outcome = explicit ? simulateOutcome : "succeed";
		if ("timeout".equals(outcome)) {
			return;
		}
		String event = "fail".equals(outcome) ? "payment.failed" : "payment.succeeded";
		long delayMs = settlementDelayMinMs >= settlementDelayMaxMs
				? settlementDelayMinMs
				: ThreadLocalRandom.current().nextLong(settlementDelayMinMs, settlementDelayMaxMs);
		Runnable fireWebhook = () -> {
			try {
				self.processProviderEvent(paymentId, event, null);
			} catch (Exception ex) {
				log.warn("simulated settlement callback failed for payment {}", paymentId, ex);
			}
		};
		if (TransactionSynchronizationManager.isSynchronizationActive()) {
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override
				public void afterCommit() {
					scheduler.schedule(fireWebhook, Instant.now().plusMillis(delayMs));
				}
			});
		} else {
			// No active transaction to hook (e.g. called from a test that isn't
			// @Transactional) — schedule directly rather than silently dropping it.
			scheduler.schedule(fireWebhook, Instant.now().plusMillis(delayMs));
		}
	}

	@Override
	@Transactional(readOnly = true)
	public Payment getById(UUID paymentId, String guestEmail) {
		Payment payment = paymentRepository.findById(paymentId)
				.orElseThrow(() -> DomainException.notFound("payment not found"));
		Reservation reservation = booking.getById(payment.getReservationId());
		ensurePaymentAccess(reservation, guestEmail);
		return payment;
	}

	@Override
	@Transactional
	public Payment capture(CapturePaymentInput in) {
		Payment payment = paymentRepository.findById(in.paymentId())
				.orElseThrow(() -> DomainException.notFound("payment not found"));
		Reservation reservation = booking.getByIdForUpdate(payment.getReservationId());
		ensurePaymentAccess(reservation, in.guestEmail());
		if (payment.getStatus() != PaymentStatus.pending) {
			throw DomainException.conflict("payment is not pending");
		}
		String providerReference = in.gatewayReference() == null || in.gatewayReference().isBlank()
				? "MOCK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase()
				: in.gatewayReference();
		// C17: (provider, provider_reference) partial unique index — a repeated
		// capture of the same provider reference resolves to the original payment.
		Payment existing = paymentRepository
				.findByProviderAndProviderReference(payment.getProvider(), providerReference)
				.orElse(null);
		if (existing != null && !existing.getId().equals(payment.getId())) {
			return existing;
		}
		return applySuccess(payment, reservation, providerReference);
	}

	/**
	 * Simulated provider callback — the counterpart to a real PSP's
	 * asynchronous webhook. Reuses the same row lock and
	 * {@code (provider, provider_reference)} idempotency {@link #capture}
	 * already relies on, so a duplicate or late delivery can never double-process:
	 * <ul>
	 *   <li><b>Unknown payment</b> — {@code DomainException.notFound} (404).</li>
	 *   <li><b>Invalid event</b> — {@code DomainException.validation} (400).</li>
	 *   <li><b>Already-paid / already-failed</b> — no-op, returns the current row.</li>
	 *   <li><b>Duplicate {@code providerReference}</b> — resolves to whichever
	 *       payment first claimed it, exactly like {@link #capture}.</li>
	 *   <li><b>Late delivery after the reservation's hold already expired and
	 *       was auto-cancelled</b> — the payment is still recorded (so staff can
	 *       see what actually happened via {@code adminPayments}) but the
	 *       reservation is never resurrected; {@link BookingService#markFullyPaid}
	 *       only promotes a reservation that is still {@code pending}.</li>
	 * </ul>
	 */
	@Override
	@Transactional
	public Payment processProviderEvent(UUID paymentId, String event, String providerReference) {
		if (!"payment.succeeded".equals(event) && !"payment.failed".equals(event)) {
			throw DomainException.validation("unknown event type: " + event);
		}
		Payment payment = paymentRepository.findById(paymentId)
				.orElseThrow(() -> DomainException.notFound("payment not found"));
		if (payment.getStatus() != PaymentStatus.pending) {
			// Already-paid, already-failed, or otherwise resolved: idempotent
			// no-op. A duplicate or late-arriving event changes nothing.
			return payment;
		}
		Reservation reservation = booking.getByIdForUpdate(payment.getReservationId());

		if ("payment.succeeded".equals(event)) {
			String ref = providerReference == null || providerReference.isBlank()
					? "MOCK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase()
					: providerReference;
			Payment existing = paymentRepository.findByProviderAndProviderReference(payment.getProvider(), ref)
					.orElse(null);
			if (existing != null && !existing.getId().equals(payment.getId())) {
				return existing;
			}
			return applySuccess(payment, reservation, ref);
		}
		return applyFailure(payment, reservation);
	}

	@Override
	@Transactional
	public Payment adminSimulateWebhook(UUID paymentId, String event, String providerReference) {
		Payment payment = paymentRepository.findById(paymentId)
				.orElseThrow(() -> DomainException.notFound("payment not found"));
		Reservation reservation = booking.getById(payment.getReservationId());
		CurrentUser actor = currentUser.require();
		if (!actor.hasRole("super_admin") && !actor.inHotel(reservation.getHotelId())) {
			throw DomainException.forbidden("no access to this hotel");
		}
		return processProviderEvent(paymentId, event, providerReference);
	}

	@Override
	@Transactional
	public Payment processProviderEventByReservationReference(String reservationReference, String event,
			String providerReference) {
		return processProviderEvent(resolvePaymentIdByReservationReference(reservationReference),
				event, providerReference);
	}

	@Override
	@Transactional
	public Payment adminSimulateWebhookByReservationReference(String reservationReference, String event,
			String providerReference) {
		return adminSimulateWebhook(resolvePaymentIdByReservationReference(reservationReference),
				event, providerReference);
	}

	/** The reservation's pending payment if one exists, otherwise its most
	 * recently created payment — a webhook/QA caller working from a
	 * human-readable reservation reference almost always means "the payment
	 * attempt that's currently in flight for this booking." */
	private UUID resolvePaymentIdByReservationReference(String reservationReference) {
		Reservation reservation = booking.getByReference(reservationReference);
		List<Payment> payments = paymentRepository.findByReservationId(reservation.getId());
		Payment target = payments.stream()
				.filter(p -> p.getStatus() == PaymentStatus.pending)
				.findFirst()
				.or(() -> payments.stream().max(Comparator.comparing(Payment::getCreatedAt)))
				.orElseThrow(() -> DomainException.notFound(
						"no payment found for reservation " + reservationReference));
		return target.getId();
	}

	/** Shared by a direct {@link #capture} and a {@code payment.succeeded} provider event. */
	private Payment applySuccess(Payment payment, Reservation reservation, String providerReference) {
		payment.setStatus(PaymentStatus.captured);
		payment.setProviderReference(providerReference);
		payment.setUpdatedAt(Instant.now());

		PaymentTransaction transaction = new PaymentTransaction();
		transaction.setPaymentId(payment.getId());
		transaction.setTransactionType("capture");
		transaction.setAmount(payment.getAmount());
		transaction.setStatus("succeeded");
		transaction.setProviderTransactionId(providerReference);
		transaction.setCreatedAt(Instant.now());
		payment.getTransactions().add(transaction);
		paymentRepository.save(payment);

		// A hold that already expired and was auto-cancelled is never
		// resurrected by a late success — markFullyPaid only promotes a
		// reservation that is still 'pending'; a 'cancelled' one is left
		// alone and this payment stays visible to staff as captured-but-orphaned.
		if (reservation.getPaymentStatus() == PaymentStatus.pending
				&& paidAmount(reservation.getId()).compareTo(reservation.getTotalAmount()) >= 0) {
			booking.markFullyPaid(reservation.getId());
		}

		eventPublisher.publish("payment.captured", 1, reservation.getHotelId(),
				"payment:" + payment.getId(),
				Map.of(
						"paymentId", payment.getId(),
						"reservationReference", reservation.getReference(),
						"amount", payment.getAmount(),
						"currencyCode", payment.getCurrencyCode()),
				null);
		return payment;
	}

	/** A simulated decline. The reservation is left {@code pending} — still
	 * holding inventory — so the guest can retry with a new payment attempt
	 * before the hold expires, rather than losing the room on the first decline. */
	private Payment applyFailure(Payment payment, Reservation reservation) {
		payment.setStatus(PaymentStatus.failed);
		payment.setUpdatedAt(Instant.now());

		PaymentTransaction transaction = new PaymentTransaction();
		transaction.setPaymentId(payment.getId());
		transaction.setTransactionType("capture");
		transaction.setAmount(payment.getAmount());
		transaction.setStatus("failed");
		transaction.setProviderTransactionId(null);
		transaction.setCreatedAt(Instant.now());
		payment.getTransactions().add(transaction);
		paymentRepository.save(payment);

		eventPublisher.publish("payment.failed", 1, reservation.getHotelId(),
				"payment:" + payment.getId(),
				Map.of(
						"paymentId", payment.getId(),
						"reservationReference", reservation.getReference(),
						"amount", payment.getAmount(),
						"currencyCode", payment.getCurrencyCode()),
				null);
		return payment;
	}

	/**
	 * Owner-or-staff access check (IDOR guard), plus an accountless-reservation
	 * escape hatch: guest checkout is a supported self-service product flow
	 * (createReservation/cancelReservation already work with no account), and
	 * payment must too — {@code bookedByUserId} is only ever set when the
	 * booker was signed in at creation time, so a purely anonymous booking has
	 * no owner to authenticate as. For that case only, the guest email on file
	 * is accepted as proof of possession, exactly like the reference+email
	 * lookup {@link BookingService#getByReferenceAndEmail} already uses — never
	 * for an account-backed reservation, so a correct guest email alone can
	 * never be used to pay someone else's account-backed booking.
	 */
	private void ensurePaymentAccess(Reservation reservation, String guestEmail) {
		Optional<CurrentUser> actor = currentUser.currentUser();
		if (actor.isPresent()) {
			boolean staff = actor.get().hasRole("super_admin") || actor.get().inHotel(reservation.getHotelId());
			boolean owner = reservation.getBookedByUserId() != null
					&& reservation.getBookedByUserId().equals(actor.get().userId());
			if (staff || owner) {
				return;
			}
		}
		if (reservation.getBookedByUserId() == null
				&& guestEmail != null && !guestEmail.isBlank()
				&& reservation.getGuest().getEmail() != null
				&& reservation.getGuest().getEmail().equalsIgnoreCase(guestEmail.trim())) {
			return;
		}
		// No credentials at all and no valid guest-email proof -> 401 (same as
		// before this change, for a caller who supplied nothing whatsoever).
		// Authenticated but not entitled, or a wrong/missing guest email on an
		// account-backed reservation -> 403.
		currentUser.require();
		throw DomainException.forbidden("no access to this reservation");
	}

	@Override
	@Transactional(readOnly = true)
	public BigDecimal paidAmount(UUID reservationId) {
		return paymentRepository.findByReservationId(reservationId).stream()
				.filter(p -> p.getStatus() == PaymentStatus.captured)
				.map(Payment::getAmount)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
	}
}
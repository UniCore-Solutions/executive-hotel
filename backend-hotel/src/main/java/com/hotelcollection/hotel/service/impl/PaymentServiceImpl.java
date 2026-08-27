package com.hotelcollection.hotel.service.impl;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
 * payment is created in {@code pending} state and moved to {@code captured}
 * only by an explicit capture (mock provider). Overpayment is rejected.
 * Provider-level idempotency is enforced by the partial unique index on
 * (provider, provider_reference) (C17) — a duplicate capture reuses the
 * existing payment.
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

	private final PaymentRepository paymentRepository;
	private final BookingService booking;
	private final EventPublisher eventPublisher;
	private final CurrentUserAccessor currentUser;

	public PaymentServiceImpl(PaymentRepository paymentRepository, BookingService booking,
			EventPublisher eventPublisher, CurrentUserAccessor currentUser) {
		this.paymentRepository = paymentRepository;
		this.booking = booking;
		this.eventPublisher = eventPublisher;
		this.currentUser = currentUser;
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
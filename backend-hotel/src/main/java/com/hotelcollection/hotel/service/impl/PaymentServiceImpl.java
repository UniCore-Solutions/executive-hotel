package com.hotelcollection.hotel.service.impl;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

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
 * <p>Authorization (audit): payments are money-affecting operations. Both
 * create and capture require an authenticated caller who is either the
 * reservation owner (bookedByUserId) or hotel staff of the reservation's
 * hotel (super_admin / hotel member). Anonymous callers are rejected.
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
		Reservation reservation = booking.getByIdForUpdate(in.reservationId());
		ensurePaymentAccess(reservation);
		if (reservation.getStatus() == ReservationStatus.cancelled) {
			throw DomainException.conflict("cannot pay for a cancelled reservation");
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
		payment.setCreatedAt(Instant.now());
		payment.setUpdatedAt(Instant.now());
		paymentRepository.save(payment);

		PaymentTransaction transaction = new PaymentTransaction();
		transaction.setPaymentId(payment.getId());
		transaction.setTransactionType("authorization");
		transaction.setAmount(in.amount());
		transaction.setStatus("pending");
		transaction.setProviderTransactionId(null);
		transaction.setCreatedAt(Instant.now());
		payment.getTransactions().add(transaction);
		paymentRepository.save(payment);

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
		ensurePaymentAccess(reservation);
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
	 * Owner or hotel-staff access check (IDOR guard). Anonymous callers are
	 * rejected; for accountless bookings only staff may operate payments.
	 */
	private void ensurePaymentAccess(Reservation reservation) {
		CurrentUser actor = currentUser.require();
		boolean staff = actor.hasRole("super_admin") || actor.inHotel(reservation.getHotelId());
		boolean owner = reservation.getBookedByUserId() != null
				&& reservation.getBookedByUserId().equals(actor.userId());
		if (!staff && !owner) {
			throw DomainException.forbidden("no access to this reservation");
		}
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
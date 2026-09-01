package com.hotelcollection.hotel.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.function.Supplier;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ContextConfiguration;

import com.hotelcollection.hotel.entity.Payment;
import com.hotelcollection.hotel.entity.PaymentStatus;
import com.hotelcollection.hotel.entity.RatePlan;
import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.entity.ReservationStatus;
import com.hotelcollection.hotel.dto.billing.CreatePaymentInput;
import com.hotelcollection.hotel.util.PaymentTerms;
import com.hotelcollection.hotel.dto.reservation.CreateResult;
import com.hotelcollection.hotel.dto.reservation.GuestInput;
import com.hotelcollection.hotel.dto.reservation.CreateReservationInput;
import com.hotelcollection.hotel.dto.reservation.RoomInput;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.exception.ErrorCode;
import com.hotelcollection.hotel.repository.AvailabilityRepository;
import com.hotelcollection.hotel.repository.RatePlanRepository;
import com.hotelcollection.hotel.repository.ReservationRepository;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.service.BookingService;
import com.hotelcollection.hotel.service.PaymentService;

/**
 * Covers the async payment-simulation design (see
 * docs/investigations/BOOKING_PAYMENT_UX_PLAN_2026-08-31.md): the payment
 * hold on a fresh reservation, its expiry compensation, and the simulated
 * webhook's idempotency across the scenarios the plan calls out (duplicate,
 * late, unknown payment, invalid event, already-paid).
 */
@SpringBootTest
@ContextConfiguration(classes = TestcontainersConfiguration.class)
class PaymentSimulationIntegrationTest {

	private static UUID uid(long n) { return new UUID(0, n); }

	@Autowired
	BookingService bookingService;
	@Autowired
	PaymentService paymentService;
	@Autowired
	ReservationRepository reservationRepository;
	@Autowired
	AvailabilityRepository availabilityRepository;
	@Autowired
	RatePlanRepository ratePlanRepository;
	@Autowired
	TestFixtures fixtures;

	private static final String GUEST_EMAIL = "sim@example.com";

	private CreateReservationInput input(TestFixtures.HotelFixture fx, String idempotencyKey, LocalDate checkIn) {
		return new CreateReservationInput(fx.hotelId(), checkIn, checkIn.plusDays(2), 2, 0,
				TestFixtures.CURRENCY,
				new GuestInput("Sim", "Guest", GUEST_EMAIL, "+212600000001", "MA"),
				List.of(new RoomInput(fx.roomType().getId(), fx.ratePlan().getId())),
				List.of(), null, idempotencyKey, null, null);
	}

	// ---------------------------------------------------------------- card auto-settlement

	@Test
	void cardPaymentAutoSettlesAndPromotesReservationToConfirmed() throws InterruptedException {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		CreateResult created = bookingService.create(input(fx, "sim-success-" + System.nanoTime(),
				LocalDate.now().plusDays(30)));
		assertThat(created.reservation().getStatus()).isEqualTo(ReservationStatus.pending);

		Payment payment = paymentService.createPayment(new CreatePaymentInput(created.reservation().getId(),
				created.reservation().getTotalAmount(), TestFixtures.CURRENCY, "card",
				"sim-success-pay-" + System.nanoTime(), GUEST_EMAIL));
		assertThat(payment.getStatus()).isEqualTo(PaymentStatus.pending);

		Payment settled = pollUntilResolved(payment.getId());
		assertThat(settled.getStatus()).isEqualTo(PaymentStatus.captured);
		assertThat(settled.getProviderReference()).isNotBlank();

		Reservation reservation = bookingService.getById(created.reservation().getId());
		assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.confirmed);
		assertThat(reservation.getPaymentStatus()).isEqualTo(PaymentStatus.captured);
		assertThat(reservation.getHoldExpiresAt()).isNull();
	}

	@Test
	void cardPaymentSimulatedDeclineLeavesReservationPendingForRetry() throws InterruptedException {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		CreateResult created = bookingService.create(input(fx, "sim-fail-" + System.nanoTime(),
				LocalDate.now().plusDays(31)));

		Payment payment = paymentService.createPayment(new CreatePaymentInput(created.reservation().getId(),
				created.reservation().getTotalAmount(), TestFixtures.CURRENCY, "card",
				"sim-fail-pay-" + System.nanoTime(), GUEST_EMAIL, "fail"));

		Payment settled = pollUntilResolved(payment.getId());
		assertThat(settled.getStatus()).isEqualTo(PaymentStatus.failed);

		// The reservation keeps its room — a decline is not a cancellation —
		// so the guest can retry with a new payment attempt before the hold expires.
		Reservation reservation = bookingService.getById(created.reservation().getId());
		assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.pending);
		assertThat(reservation.getPaymentStatus()).isEqualTo(PaymentStatus.pending);

		Payment retry = paymentService.createPayment(new CreatePaymentInput(created.reservation().getId(),
				created.reservation().getTotalAmount(), TestFixtures.CURRENCY, "card",
				"sim-fail-retry-" + System.nanoTime(), GUEST_EMAIL));
		Payment retrySettled = pollUntilResolved(retry.getId());
		assertThat(retrySettled.getStatus()).isEqualTo(PaymentStatus.captured);
		assertThat(bookingService.getById(created.reservation().getId()).getStatus())
				.isEqualTo(ReservationStatus.confirmed);
	}

	@Test
	void simulateOutcomeTimeoutNeverSettles() throws InterruptedException {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		CreateResult created = bookingService.create(input(fx, "sim-timeout-" + System.nanoTime(),
				LocalDate.now().plusDays(32)));

		Payment payment = paymentService.createPayment(new CreatePaymentInput(created.reservation().getId(),
				created.reservation().getTotalAmount(), TestFixtures.CURRENCY, "card",
				"sim-timeout-pay-" + System.nanoTime(), GUEST_EMAIL, "timeout"));

		// Give the (non-existent) scheduled callback more than enough time to
		// have fired if one had been scheduled, then confirm it never was.
		Thread.sleep(400);
		assertThat(paymentService.getById(payment.getId(), GUEST_EMAIL).getStatus())
				.isEqualTo(PaymentStatus.pending);
	}

	// ---------------------------------------------------------------- webhook idempotency

	@Test
	void processProviderEventIsIdempotentForAnAlreadyCapturedPayment() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		CreateResult created = bookingService.create(input(fx, "wh-already-paid-" + System.nanoTime(),
				LocalDate.now().plusDays(33)));
		Payment payment = asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), created.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", "wh-already-paid-pay-" + System.nanoTime(), null)));
		Payment captured = asStaff(() -> paymentService.capture(
				new com.hotelcollection.hotel.dto.billing.CapturePaymentInput(payment.getId(), null, null)));

		// Already-paid: a late/duplicate success event is a no-op, not a re-process.
		Payment again = paymentService.processProviderEvent(payment.getId(), "payment.succeeded", "SOME-OTHER-REF");
		assertThat(again.getId()).isEqualTo(captured.getId());
		assertThat(again.getProviderReference()).isEqualTo(captured.getProviderReference());
	}

	@Test
	void processProviderEventRejectsUnknownPayment() {
		assertThatThrownBy(() -> paymentService.processProviderEvent(UUID.randomUUID(), "payment.succeeded", null))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.NOT_FOUND);
	}

	@Test
	void processProviderEventRejectsAnInvalidEventType() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		CreateResult created = bookingService.create(input(fx, "wh-invalid-event-" + System.nanoTime(),
				LocalDate.now().plusDays(34)));
		Payment payment = asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), created.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", "wh-invalid-event-pay-" + System.nanoTime(), null)));

		assertThatThrownBy(() -> paymentService.processProviderEvent(payment.getId(), "payment.bogus", null))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.VALIDATION);
	}

	@Test
	void processProviderEventDuplicateProviderReferenceResolvesToTheOriginal() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		LocalDate checkIn = LocalDate.now().plusDays(35);
		CreateResult resA = bookingService.create(input(fx, "wh-dup-a-" + System.nanoTime(), checkIn));
		CreateResult resB = bookingService.create(input(fx, "wh-dup-b-" + System.nanoTime(), checkIn));
		Payment paymentA = asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				resA.reservation().getId(), resA.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", "wh-dup-pay-a-" + System.nanoTime(), null)));
		Payment paymentB = asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				resB.reservation().getId(), resB.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", "wh-dup-pay-b-" + System.nanoTime(), null)));

		Payment settledA = paymentService.processProviderEvent(paymentA.getId(), "payment.succeeded", "DUP-REF-1");
		assertThat(settledA.getStatus()).isEqualTo(PaymentStatus.captured);

		// Same provider reference delivered again, addressed to a DIFFERENT
		// payment id — resolves to the original, paymentB is left untouched.
		Payment resolved = paymentService.processProviderEvent(paymentB.getId(), "payment.succeeded", "DUP-REF-1");
		assertThat(resolved.getId()).isEqualTo(settledA.getId());
		assertThat(paymentService.paidAmount(resB.reservation().getId())).isZero();
	}

	@Test
	void lateWebhookAfterHoldExpiryDoesNotResurrectTheCancelledReservation() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		LocalDate checkIn = LocalDate.now().plusDays(36);
		CreateResult created = bookingService.create(input(fx, "wh-late-" + System.nanoTime(), checkIn));
		Payment payment = asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), created.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", "wh-late-pay-" + System.nanoTime(), null)));

		// Force the hold into the past and run the expiry job's per-reservation
		// step directly (see platform-testing convention: manipulate + invoke,
		// don't sleep for real minutes).
		Reservation reservation = reservationRepository.findById(created.reservation().getId()).orElseThrow();
		reservation.setHoldExpiresAt(Instant.now().minus(1, ChronoUnit.MINUTES));
		reservationRepository.save(reservation);
		bookingService.expireHold(created.reservation().getId());

		Reservation cancelled = bookingService.getById(created.reservation().getId());
		assertThat(cancelled.getStatus()).isEqualTo(ReservationStatus.cancelled);
		assertThat(cancelled.getCancellation().getCancellationReasonId()).isNotNull();
		var rows = availabilityRepository.findByRoomTypeIdsAndRange(List.of(fx.roomType().getId()),
				checkIn, checkIn.plusDays(1));
		assertThat(rows).noneMatch(r -> r.getRoomsSold() > 0);

		// The late success now arrives — recorded, but must not resurrect the
		// cancelled reservation or re-sell the room it already gave back.
		Payment lateSettled = paymentService.processProviderEvent(payment.getId(), "payment.succeeded", null);
		assertThat(lateSettled.getStatus()).isEqualTo(PaymentStatus.captured);
		Reservation stillCancelled = bookingService.getById(created.reservation().getId());
		assertThat(stillCancelled.getStatus()).isEqualTo(ReservationStatus.cancelled);
	}

	// ---------------------------------------------------------------- hold expiry mechanics

	@Test
	void expireHoldIsANoOpOnceTheReservationIsAlreadyConfirmed() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		LocalDate checkIn = LocalDate.now().plusDays(37);
		CreateResult created = bookingService.create(input(fx, "hold-race-" + System.nanoTime(), checkIn));
		Payment payment = asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), created.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", "hold-race-pay-" + System.nanoTime(), null)));
		asStaff(() -> paymentService.capture(
				new com.hotelcollection.hotel.dto.billing.CapturePaymentInput(payment.getId(), null, null)));
		assertThat(bookingService.getById(created.reservation().getId()).getStatus())
				.isEqualTo(ReservationStatus.confirmed);

		// A late-firing job tick for a reservation that captured in the
		// meantime must never re-check or cancel it.
		bookingService.expireHold(created.reservation().getId());
		assertThat(bookingService.getById(created.reservation().getId()).getStatus())
				.isEqualTo(ReservationStatus.confirmed);
	}

	@Test
	void findExpiredHoldIdsOnlyReturnsPendingReservationsPastTheirHold() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		CreateResult freshHold = bookingService.create(
				input(fx, "hold-fresh-" + System.nanoTime(), LocalDate.now().plusDays(38)));
		CreateResult expiredHold = bookingService.create(
				input(fx, "hold-expired-" + System.nanoTime(), LocalDate.now().plusDays(39)));
		Reservation toExpire = reservationRepository.findById(expiredHold.reservation().getId()).orElseThrow();
		toExpire.setHoldExpiresAt(Instant.now().minus(1, ChronoUnit.MINUTES));
		reservationRepository.save(toExpire);

		List<UUID> candidates = bookingService.findExpiredHoldIds();
		assertThat(candidates).contains(expiredHold.reservation().getId());
		assertThat(candidates).doesNotContain(freshHold.reservation().getId());
	}

	// ------------------------------------------------------- pay at the property

	/**
	 * A pay-at-property booking has no payment to wait for, so it is confirmed
	 * outright and carries no hold. The hold is what the expiry job keys on
	 * ({@code status = pending AND holdExpiresAt < now}); giving one of these
	 * bookings a hold would auto-cancel it minutes after the guest made it.
	 */
	@Test
	void payAtPropertyBookingIsConfirmedWithoutAHoldAndSurvivesTheExpiryJob() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		payAtProperty(fx);

		CreateResult created = bookingService.create(
				input(fx, "pap-" + System.nanoTime(), LocalDate.now().plusDays(41)));
		Reservation reservation = created.reservation();

		assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.confirmed);
		assertThat(reservation.getHoldExpiresAt()).isNull();
		assertThat(reservation.getPaymentStatus()).isEqualTo(PaymentStatus.pending);

		// The reaper must not see it, however long it sits there.
		assertThat(bookingService.findExpiredHoldIds()).doesNotContain(reservation.getId());
		bookingService.expireHold(reservation.getId());
		assertThat(bookingService.getById(reservation.getId()).getStatus())
				.isEqualTo(ReservationStatus.confirmed);
	}

	@Test
	void payAtPropertyQuoteTakesNothingAtBooking() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		payAtProperty(fx);

		CreateResult created = bookingService.create(
				input(fx, "pap-quote-" + System.nanoTime(), LocalDate.now().plusDays(42)));
		// The stay still has a total — it is simply collected at the property.
		assertThat(created.reservation().getTotalAmount()).isPositive();
	}

	@Test
	void prepaidBookingStillWaitsOnAHold() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		CreateResult created = bookingService.create(
				input(fx, "prepaid-" + System.nanoTime(), LocalDate.now().plusDays(43)));

		assertThat(created.reservation().getStatus()).isEqualTo(ReservationStatus.pending);
		assertThat(created.reservation().getHoldExpiresAt()).isNotNull();
	}

	/** Switches the fixture's plan to settle at the property. */
	private void payAtProperty(TestFixtures.HotelFixture fx) {
		RatePlan plan = ratePlanRepository.findById(fx.ratePlan().getId()).orElseThrow();
		plan.setPaymentTiming(PaymentTerms.PAY_AT_PROPERTY);
		ratePlanRepository.save(plan);
	}

	// ---------------------------------------------------------------- admin manual trigger

	@Test
	void adminSimulateWebhookRequiresStaffAccessToTheReservationsHotel() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		CreateResult created = bookingService.create(
				input(fx, "admin-wh-" + System.nanoTime(), LocalDate.now().plusDays(40)));
		Payment payment = asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), created.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", "admin-wh-pay-" + System.nanoTime(), null)));

		CurrentUser unrelatedStaff = new CurrentUser(uid(701), "other-hotel-staff@example.com",
				List.of("hotel_manager"), List.of(uid(99999)), Instant.now());
		assertThatThrownBy(() -> as(unrelatedStaff, () ->
				paymentService.adminSimulateWebhook(payment.getId(), "payment.succeeded", null)))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.FORBIDDEN);

		Payment settled = asStaff(() -> paymentService.adminSimulateWebhook(payment.getId(), "payment.succeeded", null));
		assertThat(settled.getStatus()).isEqualTo(PaymentStatus.captured);
	}

	@Test
	void webhookByReservationReferenceResolvesThePendingPaymentAndFailsCleanlyWhenNoneExists() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		CreateResult created = bookingService.create(
				input(fx, "wh-ref-" + System.nanoTime(), LocalDate.now().plusDays(41)));
		Payment payment = asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), created.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", "wh-ref-pay-" + System.nanoTime(), null)));

		Payment settled = paymentService.processProviderEventByReservationReference(
				created.reservation().getReference(), "payment.succeeded", null);
		assertThat(settled.getId()).isEqualTo(payment.getId());
		assertThat(settled.getStatus()).isEqualTo(PaymentStatus.captured);

		// No reservation with that reference at all.
		assertThatThrownBy(() -> paymentService.processProviderEventByReservationReference(
				"RC-DOESNOTEXIST", "payment.succeeded", null))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.NOT_FOUND);

		// A real reservation, but with no payment at all yet.
		CreateResult noPayment = bookingService.create(
				input(fx, "wh-ref-none-" + System.nanoTime(), LocalDate.now().plusDays(42)));
		assertThatThrownBy(() -> paymentService.processProviderEventByReservationReference(
				noPayment.reservation().getReference(), "payment.succeeded", null))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.NOT_FOUND);
	}

	// ---------------------------------------------------------------- helpers

	/** Polls the read-only status check for the async simulated settlement to
	 * land — bounded well above the test config's 50-150ms delay window (see
	 * test application.yaml). Mirrors exactly what the frontend's own polling
	 * hook does against the guest-facing status check. */
	private Payment pollUntilResolved(UUID paymentId) throws InterruptedException {
		for (int i = 0; i < 40; i++) {
			Payment payment = paymentService.getById(paymentId, GUEST_EMAIL);
			if (payment.getStatus() != PaymentStatus.pending) {
				return payment;
			}
			Thread.sleep(50);
		}
		throw new AssertionError("payment " + paymentId + " never resolved past PENDING within 2s");
	}

	private <T> T asStaff(Supplier<T> action) {
		CurrentUser staff = new CurrentUser(uid(999), "staff@example.com", List.of("super_admin"),
				List.of(), Instant.now());
		return as(staff, action);
	}

	private <T> T as(CurrentUser actor, Supplier<T> action) {
		var auth = new UsernamePasswordAuthenticationToken(actor, null,
				actor.roles().stream().map(r -> new SimpleGrantedAuthority("ROLE_" + r)).toList());
		SecurityContextHolder.getContext().setAuthentication(auth);
		try {
			return action.get();
		} finally {
			SecurityContextHolder.clearContext();
		}
	}
}

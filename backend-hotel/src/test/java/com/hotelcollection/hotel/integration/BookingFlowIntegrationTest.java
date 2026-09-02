package com.hotelcollection.hotel.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.function.Supplier;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ContextConfiguration;

import com.hotelcollection.hotel.entity.CreditNote;
import com.hotelcollection.hotel.entity.Invoice;
import com.hotelcollection.hotel.entity.Payment;
import com.hotelcollection.hotel.entity.PaymentStatus;
import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.entity.ReservationStatus;
import com.hotelcollection.hotel.dto.reservation.CancelReservationInput;
import com.hotelcollection.hotel.dto.billing.CapturePaymentInput;
import com.hotelcollection.hotel.dto.billing.CreatePaymentInput;
import com.hotelcollection.hotel.dto.reservation.CreateReservationInput;
import com.hotelcollection.hotel.dto.reservation.CreateResult;
import com.hotelcollection.hotel.dto.reservation.GuestInput;
import com.hotelcollection.hotel.dto.reservation.RoomInput;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.exception.ErrorCode;
import com.hotelcollection.hotel.repository.AvailabilityRepository;
import com.hotelcollection.hotel.repository.EventOutboxRepository;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.service.BookingService;
import com.hotelcollection.hotel.service.InvoiceService;
import com.hotelcollection.hotel.service.PaymentService;
import com.hotelcollection.hotel.service.AuthService;
import com.hotelcollection.hotel.dto.identity.RegisterInput;

/**
 * End-to-end booking flow against real PostgreSQL + Kafka (Testcontainers):
 * create (server-side pricing, inventory sold, outbox event) → idempotent
 * retry → lookup by reference+email → cancel (penalty + inventory released)
 * → payment capture (staff actor) → invoice.
 */
@SpringBootTest
@ContextConfiguration(classes = TestcontainersConfiguration.class)
class BookingFlowIntegrationTest {
	private static UUID uid(long n) { return new UUID(0, n); }

	@Autowired
	BookingService bookingService;
	@Autowired
	PaymentService paymentService;
	@Autowired
	InvoiceService invoiceService;
	@Autowired
	AvailabilityRepository availabilityRepository;
	@Autowired
	EventOutboxRepository outboxRepository;
	@Autowired
	TestFixtures fixtures;
	@Autowired
	AuthService authService;

	private static final String GUEST_EMAIL = "amine@example.com";

	private CreateReservationInput input(TestFixtures.HotelFixture fx, String idempotencyKey,
			LocalDate checkIn, int nights) {
		return new CreateReservationInput(fx.hotelId(), checkIn, checkIn.plusDays(nights), 2, 0,
				TestFixtures.CURRENCY,
				new GuestInput("Amine", "El Idrissi", GUEST_EMAIL, "+212600000000", "MA"),
				List.of(new RoomInput(fx.roomType().getId(), fx.ratePlan().getId())),
				List.of(), null, idempotencyKey, null, null);
	}

	@Test
	void sparseInventoryMaterializesOnlyStayNightsAndDeletesOnFullRelease() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		UUID roomTypeId = fx.roomType().getId();
		LocalDate checkIn = LocalDate.now().plusDays(10);

		// idle hotel: no availability rows at all (sparse model)
		assertThat(availabilityRepository.findByRoomTypeIdsAndRange(List.of(roomTypeId), checkIn,
				checkIn.plusDays(1))).isEmpty();

		// booking materializes only the nights of the stay
		String key = "sparse-" + System.nanoTime();
		CreateResult created = bookingService.create(input(fx, key, checkIn, 2));
		var rows = availabilityRepository.findByRoomTypeIdsAndRange(List.of(roomTypeId), checkIn,
				checkIn.plusDays(1));
		assertThat(rows).hasSize(2);
		assertThat(rows).allMatch(r -> r.getRoomsSold() == 1);

		// full release on cancel: rows deleted again (nothing sold, nothing blocked)
		bookingService.cancel(new CancelReservationInput(created.reservation().getReference(),
				GUEST_EMAIL, null, null));
		assertThat(availabilityRepository.findByRoomTypeIdsAndRange(List.of(roomTypeId), checkIn,
				checkIn.plusDays(1))).isEmpty();
	}

	@Test
	void bookingLifecycle() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String key = "booking-lifecycle-" + System.nanoTime();
		LocalDate checkIn = LocalDate.now().plusDays(5);

		// --- create ---
		CreateResult created = bookingService.create(input(fx, key, checkIn, 3));
		assertThat(created.created()).isTrue();
		Reservation reservation = created.reservation();
		assertThat(reservation.getReference()).matches("RC-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}");
		// A fresh reservation is a payment hold, not yet confirmed — see
		// docs/investigations/BOOKING_PAYMENT_UX_PLAN_2026-08-31.md.
		assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.pending);
		assertThat(reservation.getHoldExpiresAt()).isNotNull().isAfter(Instant.now());
		assertThat(reservation.getTotalAmount()).isEqualByComparingTo(new BigDecimal("3360.00"));
		assertThat(reservation.getRoomLines()).hasSize(1);
		assertThat(reservation.getCharges()).hasSize(1);
		assertThat(reservation.getPaymentStatus()).isEqualTo(PaymentStatus.pending);

		// --- inventory sold ---
		var rows = availabilityRepository.findByRoomTypeIdsAndRange(List.of(fx.roomType().getId()),
				reservation.getCheckInDate(), reservation.getCheckOutDate().minusDays(1));
		assertThat(rows).hasSize(3);
		assertThat(rows).allMatch(r -> r.getRoomsSold() == 1);

		// --- outbox event written in the same transaction (a hold, not yet a
		// confirmation — that event fires separately once payment captures,
		// see the capture assertions further below) ---
		assertThat(outboxRepository.findByEventType("booking.created"))
				.anyMatch(e -> e.getPayload() != null
						&& String.valueOf(e.getPayload().get("reference")).equals(reservation.getReference()));

		// --- idempotent retry returns the same reservation ---
		CreateResult retry = bookingService.create(input(fx, key, checkIn, 3));
		assertThat(retry.created()).isFalse();
		assertThat(retry.reservation().getId()).isEqualTo(reservation.getId());

		// --- lookup by reference + email (accountless, frontend flow) ---
		Reservation lookedUp = bookingService.getByReferenceAndEmail(reservation.getReference(), GUEST_EMAIL);
		assertThat(lookedUp.getId()).isEqualTo(reservation.getId());

		// --- inventory of 3: two more bookings fit, the fourth conflicts ---
		CreateResult second = bookingService.create(input(fx, key + "-2", checkIn, 3));
		assertThat(second.created()).isTrue();
		assertThat(bookingService.create(input(fx, key + "-3", checkIn, 3)).created()).isTrue();
		assertThatThrownBy(() -> bookingService.create(input(fx, key + "-4", checkIn, 3)))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.CONFLICT);

		// --- cancel within the free window: no penalty, inventory released ---
		Reservation cancelled = bookingService.cancel(new CancelReservationInput(
				reservation.getReference(), GUEST_EMAIL, "guest_changed_plans", "plans changed"));
		assertThat(cancelled.getStatus()).isEqualTo(ReservationStatus.cancelled);
		assertThat(cancelled.getCancellation()).isNotNull();
		assertThat(cancelled.getCancellation().getPenaltyAmount()).isZero();
		// This reservation was never paid — still a payment hold when
		// cancelled — so the refund is correctly 0, not the reservation
		// total. (Was previously the total minus penalty regardless of what
		// was actually collected — a fabricated refund for money never
		// taken; see the dedicated refund tests below.)
		assertThat(cancelled.getCancellation().getRefundAmount()).isZero();
		rows = availabilityRepository.findByRoomTypeIdsAndRange(List.of(fx.roomType().getId()),
				reservation.getCheckInDate(), reservation.getCheckOutDate().minusDays(1));
		assertThat(rows).allMatch(r -> r.getRoomsSold() == 2);

		// --- cancel 1 day before check-in: first-night penalty ---
		LocalDate soon = LocalDate.now().plusDays(1);
		CreateResult soonCreated = bookingService.create(input(fx, key + "-soon", soon, 1));
		Reservation cancelledSoon = bookingService.cancel(new CancelReservationInput(
				soonCreated.reservation().getReference(), GUEST_EMAIL, null, null));
		assertThat(cancelledSoon.getCancellation().getPenaltyAmount())
				.isEqualByComparingTo(new BigDecimal("1000.00"));

		// --- pay + capture the second reservation (staff actor), then invoice ---
		var payment = asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				second.reservation().getId(), new BigDecimal("3360.00"), TestFixtures.CURRENCY, "mock",
				"pay-" + System.nanoTime(), null)));
		assertThat(payment.getStatus()).isEqualTo(PaymentStatus.pending);
		var captured = asStaff(
				() -> paymentService.capture(new CapturePaymentInput(payment.getId(), null, null)));
		assertThat(captured.getStatus()).isEqualTo(PaymentStatus.captured);
		assertThat(captured.getProviderReference()).isNotNull();

		Reservation paid = bookingService.getByReferenceAndEmail(second.reservation().getReference(),
				GUEST_EMAIL);
		assertThat(paid.getPaymentStatus()).isEqualTo(PaymentStatus.captured);
		// Capture promotes the payment hold to a real confirmation.
		assertThat(paid.getStatus()).isEqualTo(ReservationStatus.confirmed);
		assertThat(paid.getHoldExpiresAt()).isNull();
		assertThat(outboxRepository.findByEventType("booking.confirmed"))
				.anyMatch(e -> e.getPayload() != null
						&& String.valueOf(e.getPayload().get("reference")).equals(paid.getReference()));

		Invoice invoice = invoiceService.getOrCreateInvoice(second.reservation().getReference(), GUEST_EMAIL);
		assertThat(invoice.getInvoiceNumber()).isEqualTo("INV-" + second.reservation().getReference());
		assertThat(invoice.getBillingName()).isEqualTo("Amine El Idrissi");
		assertThat(invoice.getItems()).isNotEmpty();
		assertThat(invoice.getTotalAmount()).isEqualByComparingTo(new BigDecimal("3360.00"));

		// --- overpayment rejected ---
		assertThatThrownBy(() -> asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				second.reservation().getId(), new BigDecimal("9999.00"), TestFixtures.CURRENCY, "mock",
				"pay-overpay-" + System.nanoTime(), null))))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.VALIDATION);
	}

	// ---------------------------------------------------------------- refund on cancellation

	@Test
	void cancellingAPaidReservationWithNoPenaltyRefundsInFullAndActuallyRefunds() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		LocalDate checkIn = LocalDate.now().plusDays(40); // comfortably inside the free-cancellation window
		CreateResult created = bookingService.create(input(fx, "refund-full-" + System.nanoTime(), checkIn, 2));
		BigDecimal total = created.reservation().getTotalAmount();

		var payment = asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), total, TestFixtures.CURRENCY, "mock",
				"refund-full-pay-" + System.nanoTime(), null)));
		asStaff(() -> paymentService.capture(new CapturePaymentInput(payment.getId(), null, null)));

		Reservation cancelled = bookingService.cancel(new CancelReservationInput(
				created.reservation().getReference(), GUEST_EMAIL, null, null));

		assertThat(cancelled.getCancellation().getPenaltyAmount()).isZero();
		assertThat(cancelled.getCancellation().getRefundAmount()).isEqualByComparingTo(total);

		// Not just a computed number: the payment and the reservation's
		// paymentStatus actually transitioned.
		Payment refunded = paymentService.getById(payment.getId(), GUEST_EMAIL);
		assertThat(refunded.getStatus()).isEqualTo(PaymentStatus.refunded);
		Reservation reloaded = bookingService.getByReferenceAndEmail(
				created.reservation().getReference(), GUEST_EMAIL);
		assertThat(reloaded.getPaymentStatus()).isEqualTo(PaymentStatus.refunded);

		// A credit note documents the adjustment against the invoice that
		// auto-issued when the payment captured.
		CreditNote note = invoiceService.getCreditNote(created.reservation().getReference(), GUEST_EMAIL);
		assertThat(note.getCreditNoteNumber()).startsWith("CN-");
		assertThat(note.getOriginalAmount()).isEqualByComparingTo(total);
		assertThat(note.getPenaltyAmount()).isZero();
		assertThat(note.getCreditedAmount()).isEqualByComparingTo(total);
	}

	@Test
	void cancellingAPaidReservationWithAPenaltyRefundsOnlyTheRemainder() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		LocalDate soon = LocalDate.now().plusDays(2); // 1-night stay starting tomorrow -> first-night penalty
		CreateResult created = bookingService.create(input(fx, "refund-partial-" + System.nanoTime(), soon, 1));
		BigDecimal total = created.reservation().getTotalAmount();

		var payment = asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), total, TestFixtures.CURRENCY, "mock",
				"refund-partial-pay-" + System.nanoTime(), null)));
		asStaff(() -> paymentService.capture(new CapturePaymentInput(payment.getId(), null, null)));

		Reservation cancelled = bookingService.cancel(new CancelReservationInput(
				created.reservation().getReference(), GUEST_EMAIL, null, null));

		BigDecimal penalty = cancelled.getCancellation().getPenaltyAmount();
		assertThat(penalty).isGreaterThan(BigDecimal.ZERO);
		BigDecimal expectedRefund = total.subtract(penalty);
		assertThat(cancelled.getCancellation().getRefundAmount()).isEqualByComparingTo(expectedRefund);

		Payment refunded = paymentService.getById(payment.getId(), GUEST_EMAIL);
		assertThat(refunded.getStatus()).isEqualTo(PaymentStatus.partially_refunded);
		Reservation reloaded = bookingService.getByReferenceAndEmail(
				created.reservation().getReference(), GUEST_EMAIL);
		assertThat(reloaded.getPaymentStatus()).isEqualTo(PaymentStatus.partially_refunded);

		CreditNote note = invoiceService.getCreditNote(created.reservation().getReference(), GUEST_EMAIL);
		assertThat(note.getOriginalAmount()).isEqualByComparingTo(total);
		assertThat(note.getPenaltyAmount()).isEqualByComparingTo(penalty);
		assertThat(note.getCreditedAmount()).isEqualByComparingTo(expectedRefund);
	}

	@Test
	void cancellingAnUnchargedReservationNeverFabricatesARefund() {
		// Pay-at-property (or simply cancelled before ever paying): no payment
		// row exists at all. This is the exact case the bug produced a
		// nonzero "refund" for money that was never collected.
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		LocalDate checkIn = LocalDate.now().plusDays(41);
		CreateResult created = bookingService.create(input(fx, "refund-none-" + System.nanoTime(), checkIn, 2));
		assertThat(paymentService.paidAmount(created.reservation().getId())).isZero();

		Reservation cancelled = bookingService.cancel(new CancelReservationInput(
				created.reservation().getReference(), GUEST_EMAIL, null, null));

		assertThat(cancelled.getCancellation().getRefundAmount()).isZero();
		// paymentStatus is left exactly as it was (pending) — never fabricated to refunded.
		assertThat(cancelled.getPaymentStatus()).isEqualTo(PaymentStatus.pending);

		// Never confirmed -> never invoiced -> nothing to issue a credit note
		// against. Not just "empty", genuinely absent (404), same as asking
		// for a credit note on a reservation that was never cancelled at all.
		assertThatThrownBy(() -> invoiceService.getCreditNote(
				created.reservation().getReference(), GUEST_EMAIL))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.NOT_FOUND);
	}

	// ---------------------------------------------------------------- Task 3: payment idempotency

	@Test
	void paymentIdempotencyKeyReturnsExistingPaymentInsteadOfDuplicating() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		LocalDate checkIn = LocalDate.now().plusDays(20);
		CreateResult created = bookingService.create(input(fx, "pay-idem-" + System.nanoTime(), checkIn, 2));

		String paymentKey = "pay-idem-key-" + System.nanoTime();
		var first = asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), created.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", paymentKey, null)));
		var retry = asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), created.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", paymentKey, null)));

		assertThat(retry.getId()).isEqualTo(first.getId());
		assertThat(paymentService.paidAmount(created.reservation().getId())).isZero(); // still only pending
	}

	@Test
	void onlyOnePendingPaymentAllowedPerReservation() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		LocalDate checkIn = LocalDate.now().plusDays(21);
		CreateResult created = bookingService.create(input(fx, "pay-pending-" + System.nanoTime(), checkIn, 2));

		asStaff(() -> paymentService.createPayment(new CreatePaymentInput(created.reservation().getId(),
				created.reservation().getTotalAmount(), TestFixtures.CURRENCY, "mock",
				"pay-pending-a-" + System.nanoTime(), null)));

		// a second, DIFFERENT payment attempt for the same reservation while the
		// first is still pending must be rejected — this is the exact scenario
		// that produced a live double-charge before V23 (see the investigation doc).
		assertThatThrownBy(() -> asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), created.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", "pay-pending-b-" + System.nanoTime(), null))))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.CONFLICT);
	}

	@Test
	void captureRetriedWithSameProviderReferenceIsIdempotent() {
		// C17: a repeated capture of the same PROVIDER REFERENCE resolves to the
		// original payment rather than double-processing — this is what protects
		// against a duplicate webhook/retry from a real PSP landing on a second
		// local payment row (V23's own pending-uniqueness index is a different,
		// narrower guarantee — at most one *pending* payment per reservation —
		// and is exercised separately by onlyOnePendingPaymentAllowedPerReservation
		// above; two DIFFERENT reservations are used here so that guarantee
		// doesn't interfere with this one).
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		LocalDate checkIn = LocalDate.now().plusDays(22);
		CreateResult reservationA = bookingService.create(
				input(fx, "pay-capture-retry-a-" + System.nanoTime(), checkIn, 2));
		CreateResult reservationB = bookingService.create(
				input(fx, "pay-capture-retry-b-" + System.nanoTime(), checkIn, 2));

		var paymentA = asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				reservationA.reservation().getId(), reservationA.reservation().getTotalAmount(),
				TestFixtures.CURRENCY, "mock", "pay-capture-retry-key-a-" + System.nanoTime(), null)));
		var paymentB = asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				reservationB.reservation().getId(), reservationB.reservation().getTotalAmount(),
				TestFixtures.CURRENCY, "mock", "pay-capture-retry-key-b-" + System.nanoTime(), null)));

		var capturedA = asStaff(() -> paymentService.capture(new CapturePaymentInput(paymentA.getId(),
				"FIXED-REF-1", null)));
		assertThat(capturedA.getStatus()).isEqualTo(PaymentStatus.captured);

		// same provider reference presented for a DIFFERENT payment -> resolves
		// to the original (paymentA), and paymentB is left untouched (still
		// pending) rather than being incorrectly marked captured itself.
		var resolved = asStaff(() -> paymentService.capture(new CapturePaymentInput(paymentB.getId(),
				"FIXED-REF-1", null)));
		assertThat(resolved.getId()).isEqualTo(capturedA.getId());
		assertThat(resolved.getStatus()).isEqualTo(PaymentStatus.captured);

		// retrying capture on the SAME payment id after it already succeeded is a
		// clean CONFLICT, not a silent no-op — the caller already has the result.
		assertThatThrownBy(() -> asStaff(() -> paymentService.capture(
				new CapturePaymentInput(paymentA.getId(), "FIXED-REF-1", null))))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.CONFLICT);
	}

	// ---------------------------------------------------------------- Task 3: accountless payment

	@Test
	void accountlessGuestCanPayWithTheEmailUsedAtBooking() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		LocalDate checkIn = LocalDate.now().plusDays(23);
		// created with NO authenticated actor — an accountless self-service booking
		CreateResult created = bookingService.create(input(fx, "pay-anon-" + System.nanoTime(), checkIn, 2));
		assertThat(created.reservation().getBookedByUserId()).isNull();

		Payment payment = paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), created.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", "pay-anon-key-" + System.nanoTime(), GUEST_EMAIL));
		assertThat(payment.getStatus()).isEqualTo(PaymentStatus.pending);

		Payment captured = paymentService.capture(new CapturePaymentInput(payment.getId(), null, GUEST_EMAIL));
		assertThat(captured.getStatus()).isEqualTo(PaymentStatus.captured);
	}

	@Test
	void accountlessPaymentRejectedWithNoProofAtAll() {
		// No authenticated actor AND no (or no valid) guest-email proof is a
		// credentials problem, not an authorization one — ensurePaymentAccess
		// falls through to currentUser.require(), which throws Spring Security's
		// AuthenticationCredentialsNotFoundException (mapped to UNAUTHORIZED at
		// the GraphQL/REST edge by GraphqlExceptionHandler / the security filter
		// chain — see PaymentServiceImpl#ensurePaymentAccess).
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		LocalDate checkIn = LocalDate.now().plusDays(24);
		CreateResult created = bookingService.create(input(fx, "pay-anon-none-" + System.nanoTime(), checkIn, 2));

		assertThatThrownBy(() -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), created.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", "pay-anon-none-key-" + System.nanoTime(), null)))
				.isInstanceOf(AuthenticationException.class);
	}

	@Test
	void accountlessPaymentRejectedWithWrongGuestEmail() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		LocalDate checkIn = LocalDate.now().plusDays(25);
		CreateResult created = bookingService.create(input(fx, "pay-anon-wrong-" + System.nanoTime(), checkIn, 2));

		// wrong email + no authentication: same as "no proof at all" above — a
		// mismatched email is not a weaker form of identification, so this is
		// still UNAUTHORIZED, not FORBIDDEN (see the previous test's comment).
		assertThatThrownBy(() -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), created.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", "pay-anon-wrong-key-" + System.nanoTime(), "someone-else@example.com")))
				.isInstanceOf(AuthenticationException.class);

		// wrong/no email but an actually-authenticated, unrelated actor -> the
		// caller IS identified, just not entitled: FORBIDDEN.
		CurrentUser stranger = new CurrentUser(uid(557), "stranger2@example.com", List.of("guest"),
				List.of(), Instant.now());
		assertThatThrownBy(() -> as(stranger, () -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), created.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", "pay-anon-wrong-key2-" + System.nanoTime(), "someone-else@example.com"))))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.FORBIDDEN);
	}

	@Test
	void guestEmailAloneCannotPayAnAccountBackedReservation() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		LocalDate checkIn = LocalDate.now().plusDays(26);
		// booked_by_user_id has an FK to users(id) — a real registered account is
		// required here (unlike the payment-only actors elsewhere in this file,
		// which never get written into that column).
		CurrentUser owner = authService
				.register(new RegisterInput("Amine", "El Idrissi", GUEST_EMAIL, "secret123")).me();
		CreateResult created = as(owner,
				() -> bookingService.create(input(fx, "pay-owned-" + System.nanoTime(), checkIn, 2)));
		assertThat(created.reservation().getBookedByUserId()).isEqualTo(owner.userId());

		// correct guest email, but the reservation IS account-backed — the
		// guest-email escape hatch must never apply here (owner or staff only),
		// so an unauthenticated caller falls all the way through to "no
		// credentials" (AuthenticationException), same as the accountless case.
		assertThatThrownBy(() -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), created.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", "pay-owned-key-" + System.nanoTime(), GUEST_EMAIL)))
				.isInstanceOf(AuthenticationException.class);

		// a different signed-in guest (not the owner, not staff) is also rejected
		CurrentUser stranger = new CurrentUser(uid(556), "stranger@example.com", List.of("guest"), List.of(),
				Instant.now());
		assertThatThrownBy(() -> as(stranger, () -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), created.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", "pay-owned-key2-" + System.nanoTime(), null))))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.FORBIDDEN);

		// the actual owner succeeds
		Payment payment = as(owner, () -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), created.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", "pay-owned-key3-" + System.nanoTime(), null)));
		assertThat(payment.getStatus()).isEqualTo(PaymentStatus.pending);
	}

	/** Runs the action with a super-admin security context (payments require an actor). */
	private <T> T asStaff(Supplier<T> action) {
		CurrentUser staff = new CurrentUser(uid(999), "staff@example.com", List.of("super_admin"),
				List.of(), Instant.now());
		return as(staff, action);
	}

	/** Runs the action authenticated as the given actor. */
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
package com.hotelcollection.hotel.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Predicate;
import java.util.function.Supplier;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;

import com.hotelcollection.hotel.dto.billing.CapturePaymentInput;
import com.hotelcollection.hotel.dto.billing.CreatePaymentInput;
import com.hotelcollection.hotel.dto.identity.RegisterInput;
import com.hotelcollection.hotel.dto.reservation.CancelReservationInput;
import com.hotelcollection.hotel.dto.reservation.CreateReservationInput;
import com.hotelcollection.hotel.dto.reservation.CreateResult;
import com.hotelcollection.hotel.dto.reservation.GuestInput;
import com.hotelcollection.hotel.dto.reservation.RoomInput;
import com.hotelcollection.hotel.entity.EventEnvelope;
import com.hotelcollection.hotel.entity.EventOutbox;
import com.hotelcollection.hotel.entity.Notification;
import com.hotelcollection.hotel.entity.EventConsumptionId;
import com.hotelcollection.hotel.entity.Payment;
import com.hotelcollection.hotel.repository.EventConsumptionRepository;
import com.hotelcollection.hotel.repository.EventOutboxRepository;
import com.hotelcollection.hotel.repository.NotificationRepository;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.service.AuthService;
import com.hotelcollection.hotel.service.BookingService;
import com.hotelcollection.hotel.service.PaymentService;
import com.hotelcollection.hotel.service.impl.EmailEventConsumer;

/**
 * End-to-end coverage of the async email pipeline against real PostgreSQL +
 * Kafka (Testcontainers): business action → outbox event → the real
 * {@code OutboxRelay} → real Kafka → {@code EmailEventConsumer} →
 * {@code NotificationServiceImpl} → {@code SimulatedEmailProvider} →
 * {@code notifications} row. The shared test config deliberately slows the
 * outbox relay to 10 minutes (so it never interleaves with an unrelated N+1
 * assertion elsewhere) — this class overrides it to 200ms just for its own
 * Spring context, the same idiom {@code RateLimitIntegrationTest} uses for
 * its own property override.
 */
@SpringBootTest
@ContextConfiguration(classes = TestcontainersConfiguration.class)
@TestPropertySource(properties = "app.outbox.relay-interval-ms=200")
class EmailNotificationIntegrationTest {

	private static UUID uid(long n) {
		return new UUID(0, n);
	}

	@Autowired
	BookingService bookingService;
	@Autowired
	PaymentService paymentService;
	@Autowired
	AuthService authService;
	@Autowired
	com.hotelcollection.hotel.service.OtpService otpService;
	@Autowired
	TestFixtures fixtures;
	@Autowired
	NotificationRepository notificationRepository;
	@Autowired
	EventConsumptionRepository eventConsumptionRepository;
	@Autowired
	EventOutboxRepository outboxRepository;
	@Autowired
	EmailEventConsumer emailEventConsumer;

	private CreateReservationInput input(TestFixtures.HotelFixture fx, String idempotencyKey, LocalDate checkIn,
			String guestEmail) {
		return new CreateReservationInput(fx.hotelId(), checkIn, checkIn.plusDays(2), 2, 0,
				TestFixtures.CURRENCY,
				new GuestInput("Nadia", "Bennani", guestEmail, "+212600000002", "MA"),
				List.of(new RoomInput(fx.roomType().getId(), fx.ratePlan().getId())),
				List.of(), null, idempotencyKey, null, null);
	}

	@Test
	void bookingConfirmationSendsConfirmationAndInvoiceEmails() throws InterruptedException {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String email = "confirm-" + System.nanoTime() + "@example.com";
		LocalDate checkIn = LocalDate.now().plusDays(30);
		CreateResult created = bookingService.create(input(fx, "email-confirm-" + System.nanoTime(), checkIn, email));
		String reference = created.reservation().getReference();

		Payment payment = asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), created.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", "email-confirm-pay-" + System.nanoTime(), null)));
		asStaff(() -> paymentService.capture(new CapturePaymentInput(payment.getId(), null, null)));

		Notification confirmation = awaitNotification("booking_confirmation", forReference(reference));
		assertThat(confirmation.getStatus()).isEqualTo("sent");
		assertThat(confirmation.getProvider()).isEqualTo("simulated");
		assertThat(confirmation.getProviderReference()).startsWith("SIM-");
		assertThat(confirmation.getEventId()).isNotNull();

		Notification invoice = awaitNotification("invoice", forReference(reference));
		assertThat(invoice.getStatus()).isEqualTo("sent");
	}

	@Test
	void cancellationSendsCancellationAndRefundEmails() throws InterruptedException {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String email = "cancel-" + System.nanoTime() + "@example.com";
		LocalDate checkIn = LocalDate.now().plusDays(40); // well inside the free-cancellation window
		CreateResult created = bookingService.create(input(fx, "email-cancel-" + System.nanoTime(), checkIn, email));
		String reference = created.reservation().getReference();
		BigDecimal total = created.reservation().getTotalAmount();

		Payment payment = asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), total, TestFixtures.CURRENCY, "mock",
				"email-cancel-pay-" + System.nanoTime(), null)));
		asStaff(() -> paymentService.capture(new CapturePaymentInput(payment.getId(), null, null)));
		// drain the confirmation/invoice emails first so later assertions only
		// see the cancellation-triggered ones.
		awaitNotification("booking_confirmation", forReference(reference));
		awaitNotification("invoice", forReference(reference));

		bookingService.cancel(new CancelReservationInput(reference, email, null, null));

		Notification cancellation = awaitNotification("booking_cancellation", forReference(reference));
		assertThat(cancellation.getStatus()).isEqualTo("sent");

		Notification refund = awaitNotification("refund", forReference(reference));
		assertThat(refund.getStatus()).isEqualTo("sent");
	}

	@Test
	void welcomeEmailSendsOnceRegistrationIsVerified() throws InterruptedException {
		String email = "welcome-" + System.nanoTime() + "@example.com";
		authService.register(new RegisterInput("New", "Guest", email, "secret123"));

		// user.registered (and so the welcome email) fires only once the
		// account is actually verified — not at register() time — so
		// confirm that first, the same way a real guest would.
		String code = otpService.issue(
				com.hotelcollection.hotel.entity.OtpPurpose.registration_verification, email, "New", null, null);
		UUID userId = authService.verifyRegistration(
				new com.hotelcollection.hotel.dto.identity.VerifyRegistrationInput(email, code)).me().userId();

		Notification welcome = awaitNotification("welcome", n -> userId.equals(n.getRecipientId()));
		assertThat(welcome.getRecipientType()).isEqualTo("user");
		assertThat(welcome.getStatus()).isEqualTo("sent");
	}

	@Test
	void paymentFailureSendsPaymentFailedEmail() throws InterruptedException {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String email = "declined-" + System.nanoTime() + "@example.com";
		LocalDate checkIn = LocalDate.now().plusDays(35);
		CreateResult created = bookingService.create(input(fx, "email-fail-" + System.nanoTime(), checkIn, email));
		String reference = created.reservation().getReference();

		// provider "mock" (not "card"): keeps PaymentServiceImpl's automatic
		// simulated-settlement scheduling out of the picture entirely — the
		// failure below is driven explicitly and immediately.
		Payment payment = asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), created.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", "email-fail-pay-" + System.nanoTime(), null)));
		asStaff(() -> paymentService.processProviderEvent(payment.getId(), "payment.failed", null));

		Notification failed = awaitNotification("payment_failed", forReference(reference));
		assertThat(failed.getStatus()).isEqualTo("sent");
	}

	/**
	 * Duplicate-event idempotency (§21): replays the exact envelope
	 * {@code EmailEventConsumer} already processed for a real
	 * {@code booking.confirmed} event and asserts no second email is sent
	 * and no second {@code notifications} row is written — the
	 * {@code event_consumption} guard (checked inside
	 * {@code NotificationServiceImpl}), not Kafka delivery semantics, is
	 * what makes this safe.
	 */
	@Test
	void duplicateEventDeliveryDoesNotDuplicateTheEmail() throws InterruptedException {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String email = "dup-" + System.nanoTime() + "@example.com";
		LocalDate checkIn = LocalDate.now().plusDays(45);
		CreateResult created = bookingService.create(input(fx, "email-dup-" + System.nanoTime(), checkIn, email));

		Payment payment = asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				created.reservation().getId(), created.reservation().getTotalAmount(), TestFixtures.CURRENCY,
				"mock", "email-dup-pay-" + System.nanoTime(), null)));
		asStaff(() -> paymentService.capture(new CapturePaymentInput(payment.getId(), null, null)));
		String reference = created.reservation().getReference();
		// Await both sub-emails the real pipeline triggers off this one event
		// before replaying — otherwise the manual replay below could race the
		// still-in-flight real delivery of whichever one isn't awaited yet.
		awaitNotification("booking_confirmation", forReference(reference));
		awaitNotification("invoice", forReference(reference));

		EventOutbox row = outboxRepository.findByEventType("booking.confirmed").stream()
				.filter(e -> e.getPayload() != null
						&& reference.equals(String.valueOf(e.getPayload().get("reference"))))
				.findFirst()
				.orElseThrow();
		EventEnvelope replay = new EventEnvelope(row.getEventId(), row.getEventType(), row.getEventVersion(),
				row.getHotelId(), row.getAggregateId(), row.getPayload(), row.getTraceId());

		// Direct re-delivery, bypassing Kafka's own timing — this isolates the
		// consumer-side idempotency guard from broker redelivery semantics.
		emailEventConsumer.onMessage(replay);
		emailEventConsumer.onMessage(replay);

		long confirmations = notificationRepository.findAll().stream()
				.filter(n -> "booking_confirmation".equals(n.getType()) && row.getEventId().equals(n.getEventId()))
				.count();
		assertThat(confirmations).isEqualTo(1);
		assertThat(eventConsumptionRepository.existsById(
				new EventConsumptionId("email:booking_confirmation", row.getEventId()))).isTrue();
	}

	// ---------------------------------------------------------------- helpers

	/** {@code Notification} has no recipient-email column (it stores
	 * {@code recipientId}, a guest/user id) — every reservation-triggered
	 * type's subject line always contains the reference (see
	 * {@code NotificationServiceImpl}), which is a safe, test-run-unique
	 * correlator since every test in this class books against a fresh
	 * reservation. Needed because this class shares one real Postgres/Kafka
	 * across all its test methods (not {@code @Transactional}) — without
	 * this, a later test's poll could match an earlier test's leftover row
	 * of the same type. */
	private static Predicate<Notification> forReference(String reference) {
		return n -> n.getSubject() != null && n.getSubject().contains(reference);
	}

	/** Polls for a {@code notifications} row of the given type matching
	 * {@code matcher} — bounded well above the 200ms relay interval
	 * configured for this test class plus real Kafka round-trip time. */
	private Notification awaitNotification(String type, Predicate<Notification> matcher)
			throws InterruptedException {
		for (int i = 0; i < 100; i++) {
			Optional<Notification> match = notificationRepository.findAll().stream()
					.filter(n -> type.equals(n.getType()))
					.filter(matcher)
					.findFirst();
			if (match.isPresent()) {
				return match.get();
			}
			Thread.sleep(100);
		}
		throw new AssertionError("no '" + type + "' notification matched within the timeout");
	}

	/** Runs the action with a super-admin security context (payments require an actor). */
	private <T> T asStaff(Supplier<T> action) {
		CurrentUser staff = new CurrentUser(uid(999), "staff@example.com", List.of("super_admin"),
				List.of(), Instant.now());
		var auth = new UsernamePasswordAuthenticationToken(staff, null,
				staff.roles().stream().map(r -> new SimpleGrantedAuthority("ROLE_" + r)).toList());
		SecurityContextHolder.getContext().setAuthentication(auth);
		try {
			return action.get();
		} finally {
			SecurityContextHolder.clearContext();
		}
	}
}

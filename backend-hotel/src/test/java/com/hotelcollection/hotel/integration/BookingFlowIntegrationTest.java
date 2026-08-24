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
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ContextConfiguration;

import com.hotelcollection.hotel.entity.Invoice;
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

	private static final String GUEST_EMAIL = "amine@example.com";

	private CreateReservationInput input(TestFixtures.HotelFixture fx, String idempotencyKey,
			LocalDate checkIn, int nights) {
		return new CreateReservationInput(fx.hotelId(), checkIn, checkIn.plusDays(nights), 2, 0,
				TestFixtures.CURRENCY,
				new GuestInput("Amine", "El Idrissi", GUEST_EMAIL, "+212600000000", "MA"),
				List.of(new RoomInput(fx.roomType().getId(), fx.ratePlan().getId())),
				List.of(), null, idempotencyKey);
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
		assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.confirmed);
		assertThat(reservation.getTotalAmount()).isEqualByComparingTo(new BigDecimal("3360.00"));
		assertThat(reservation.getRoomLines()).hasSize(1);
		assertThat(reservation.getCharges()).hasSize(1);
		assertThat(reservation.getPaymentStatus()).isEqualTo(PaymentStatus.pending);

		// --- inventory sold ---
		var rows = availabilityRepository.findByRoomTypeIdsAndRange(List.of(fx.roomType().getId()),
				reservation.getCheckInDate(), reservation.getCheckOutDate().minusDays(1));
		assertThat(rows).hasSize(3);
		assertThat(rows).allMatch(r -> r.getRoomsSold() == 1);

		// --- outbox event written in the same transaction ---
		assertThat(outboxRepository.findByEventType("booking.confirmed"))
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
		assertThat(cancelled.getCancellation().getRefundAmount())
				.isEqualByComparingTo(new BigDecimal("3360.00"));
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
				second.reservation().getId(), new BigDecimal("3360.00"), TestFixtures.CURRENCY, "mock")));
		assertThat(payment.getStatus()).isEqualTo(PaymentStatus.pending);
		var captured = asStaff(
				() -> paymentService.capture(new CapturePaymentInput(payment.getId(), null)));
		assertThat(captured.getStatus()).isEqualTo(PaymentStatus.captured);
		assertThat(captured.getProviderReference()).isNotNull();

		Reservation paid = bookingService.getByReferenceAndEmail(second.reservation().getReference(),
				GUEST_EMAIL);
		assertThat(paid.getPaymentStatus()).isEqualTo(PaymentStatus.captured);

		Invoice invoice = invoiceService.getOrCreateInvoice(second.reservation().getReference(), GUEST_EMAIL);
		assertThat(invoice.getInvoiceNumber()).isEqualTo("INV-" + second.reservation().getReference());
		assertThat(invoice.getBillingName()).isEqualTo("Amine El Idrissi");
		assertThat(invoice.getItems()).isNotEmpty();
		assertThat(invoice.getTotalAmount()).isEqualByComparingTo(new BigDecimal("3360.00"));

		// --- overpayment rejected ---
		assertThatThrownBy(() -> asStaff(() -> paymentService.createPayment(new CreatePaymentInput(
				second.reservation().getId(), new BigDecimal("9999.00"), TestFixtures.CURRENCY, "mock"))))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.VALIDATION);
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
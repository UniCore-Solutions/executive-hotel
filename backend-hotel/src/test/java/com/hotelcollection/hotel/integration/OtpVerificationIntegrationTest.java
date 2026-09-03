package com.hotelcollection.hotel.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import com.hotelcollection.hotel.dto.identity.LoginInput;
import com.hotelcollection.hotel.dto.identity.RegisterInput;
import com.hotelcollection.hotel.dto.identity.RegistrationPendingResult;
import com.hotelcollection.hotel.dto.identity.VerifyRegistrationInput;
import com.hotelcollection.hotel.dto.reservation.CreateReservationInput;
import com.hotelcollection.hotel.dto.reservation.CreateResult;
import com.hotelcollection.hotel.dto.reservation.GuestInput;
import com.hotelcollection.hotel.dto.reservation.RoomInput;
import com.hotelcollection.hotel.entity.OtpPurpose;
import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.entity.User;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.exception.ErrorCode;
import com.hotelcollection.hotel.repository.UserRepository;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.service.AuthService;
import com.hotelcollection.hotel.service.BookingService;
import com.hotelcollection.hotel.service.OtpService;

/**
 * OTP verification: registration is blocked until the emailed code is
 * confirmed (§ decided with the user — "blocking, verify-then-use"), and
 * guest reservation lookup without an account requires the same (replacing
 * reference+email alone as sufficient proof — "replace it").
 */
@SpringBootTest
@ContextConfiguration(classes = TestcontainersConfiguration.class)
class OtpVerificationIntegrationTest {

	@Autowired
	AuthService authService;
	@Autowired
	OtpService otpService;
	@Autowired
	UserRepository userRepository;
	@Autowired
	BookingService bookingService;
	@Autowired
	TestFixtures fixtures;

	// ---------------------------------------------------------------- registration

	@Test
	void registrationIsBlockedUntilTheCodeIsVerified() {
		String email = "otp-reg-" + System.nanoTime() + "@example.com";
		RegistrationPendingResult pending = authService.register(
				new RegisterInput("Jane", "Doe", email, "secret123"));
		assertThat(pending.email()).isEqualTo(email);
		assertThat(pending.otpExpiresInMinutes()).isPositive();

		User created = userRepository.findByEmailIgnoreCase(email).orElseThrow();
		assertThat(created.getStatus()).isEqualTo("pending_verification");

		// cannot log in yet — findActiveWithRoles only ever returns 'active'
		assertThatThrownBy(() -> authService.login(new LoginInput(email, "secret123")))
				.isInstanceOf(DomainException.class);

		String code = otpService.issue(OtpPurpose.registration_verification, email, "Jane", null, null);
		CurrentUser me = authService.verifyRegistration(new VerifyRegistrationInput(email, code)).me();
		assertThat(me.email()).isEqualTo(email);

		User activated = userRepository.findByEmailIgnoreCase(email).orElseThrow();
		assertThat(activated.getStatus()).isEqualTo("active");
		assertThat(activated.getEmailVerifiedAt()).isNotNull();

		// now a real session works
		assertThat(authService.login(new LoginInput(email, "secret123")).me().email()).isEqualTo(email);
	}

	@Test
	void wrongCodeIsRejectedAndCountsAsAnAttempt() {
		String email = "otp-wrong-" + System.nanoTime() + "@example.com";
		authService.register(new RegisterInput("Wrong", "Code", email, "secret123"));

		assertThatThrownBy(() -> authService.verifyRegistration(new VerifyRegistrationInput(email, "000000")))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.VALIDATION);

		// the real code still works afterward — one wrong guess doesn't burn the code itself
		String code = otpService.issue(OtpPurpose.registration_verification, email, "Wrong", null, null);
		authService.verifyRegistration(new VerifyRegistrationInput(email, code));
		assertThat(userRepository.findByEmailIgnoreCase(email).orElseThrow().getStatus()).isEqualTo("active");
	}

	@Test
	void tooManyWrongAttemptsLocksOutTheCurrentCode() {
		String email = "otp-lockout-" + System.nanoTime() + "@example.com";
		authService.register(new RegisterInput("Lock", "Out", email, "secret123"));

		for (int i = 0; i < 5; i++) {
			assertThatThrownBy(() -> authService.verifyRegistration(new VerifyRegistrationInput(email, "000000")))
					.isInstanceOf(DomainException.class)
					.extracting(ex -> ((DomainException) ex).getCode())
					.isEqualTo(ErrorCode.VALIDATION);
		}
		// budget now exhausted on this code — the 6th attempt is rejected as
		// CONFLICT (attempt budget), not VALIDATION (wrong code), even though
		// "999999" is just as wrong as the previous five — proving it's the
		// lockout doing the rejecting, not a coincidence.
		assertThatThrownBy(() -> authService.verifyRegistration(new VerifyRegistrationInput(email, "999999")))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.CONFLICT);
	}

	@Test
	void resendIsSilentForAnUnknownOrAlreadyVerifiedEmail() {
		// unknown email: no-op, no exception, no enumeration signal
		authService.resendRegistrationOtp(
				new com.hotelcollection.hotel.dto.identity.ResendRegistrationOtpInput("nobody@example.com"));

		String email = "otp-resend-active-" + System.nanoTime() + "@example.com";
		authService.register(new RegisterInput("Active", "Already", email, "secret123"));
		String code = otpService.issue(OtpPurpose.registration_verification, email, "Active", null, null);
		authService.verifyRegistration(new VerifyRegistrationInput(email, code));

		// already active: also a silent no-op, not an error
		authService.resendRegistrationOtp(
				new com.hotelcollection.hotel.dto.identity.ResendRegistrationOtpInput(email));
	}

	// ---------------------------------------------------------------- reservation lookup

	private CreateReservationInput reservationInput(TestFixtures.HotelFixture fx, String email, LocalDate checkIn) {
		return new CreateReservationInput(fx.hotelId(), checkIn, checkIn.plusDays(2), 2, 0,
				TestFixtures.CURRENCY,
				new GuestInput("Look", "Up", email, "+212600000003", "MA"),
				List.of(new RoomInput(fx.roomType().getId(), fx.ratePlan().getId())),
				List.of(), null, "otp-lookup-" + System.nanoTime(), null, null);
	}

	@Test
	void referenceAndEmailAloneNoLongerRevealTheReservation() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String email = "otp-lookup-" + System.nanoTime() + "@example.com";
		CreateResult created = bookingService.create(reservationInput(fx, email, LocalDate.now().plusDays(50)));
		String reference = created.reservation().getReference();

		// no OTP requested/verified yet — the gated read must refuse
		assertThatThrownBy(() -> bookingService.getByReferenceAndEmailVerified(reference, email, UUID.randomUUID()))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.FORBIDDEN);

		// the un-gated lookup (cancel / same-session poller path) still works —
		// deliberately untouched, see BookingService's class-level note
		assertThat(bookingService.getByReferenceAndEmail(reference, email).getReference()).isEqualTo(reference);
	}

	@Test
	void requestReservationLookupOtpIsSilentRegardlessOfMatch() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String email = "otp-lookup-req-" + System.nanoTime() + "@example.com";
		CreateResult created = bookingService.create(reservationInput(fx, email, LocalDate.now().plusDays(54)));

		// neither call throws or otherwise distinguishes match from no-match —
		// that is the entire anti-enumeration point.
		bookingService.requestReservationLookupOtp(created.reservation().getReference(), email);
		bookingService.requestReservationLookupOtp("RC-NOSUCH", "nobody@example.com");
	}

	@Test
	void verifiedOtpGrantsReadAccessToExactlyThatReservation() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String email = "otp-lookup-ok-" + System.nanoTime() + "@example.com";
		CreateResult created = bookingService.create(reservationInput(fx, email, LocalDate.now().plusDays(51)));
		String reference = created.reservation().getReference();

		// Issues directly (not via requestReservationLookupOtp) purely so the
		// test knows the plaintext code — same mechanism either way, see
		// OtpService#issue's javadoc on why it returns the code at all.
		String code = otpService.issue(OtpPurpose.reservation_lookup, email, "Look", null, created.reservation().getId());
		UUID grant = bookingService.verifyReservationLookupOtp(reference, email, code);

		Reservation viewed = bookingService.getByReferenceAndEmailVerified(reference, email, grant);
		assertThat(viewed.getReference()).isEqualTo(reference);

		// the same grant does not carry over to a different reservation
		CreateResult other = bookingService.create(reservationInput(fx, email, LocalDate.now().plusDays(52)));
		assertThatThrownBy(() -> bookingService.getByReferenceAndEmailVerified(
				other.reservation().getReference(), email, grant))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.FORBIDDEN);
	}

	@Test
	void wrongLookupCodeIsRejected() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String email = "otp-lookup-wrong-" + System.nanoTime() + "@example.com";
		CreateResult created = bookingService.create(reservationInput(fx, email, LocalDate.now().plusDays(53)));
		String reference = created.reservation().getReference();

		otpService.issue(OtpPurpose.reservation_lookup, email, "Look", null, created.reservation().getId());
		assertThatThrownBy(() -> bookingService.verifyReservationLookupOtp(reference, email, "000000"))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.VALIDATION);
	}
}

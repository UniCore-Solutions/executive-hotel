package com.hotelcollection.hotel.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ContextConfiguration;

import com.hotelcollection.hotel.dto.identity.LoginInput;
import com.hotelcollection.hotel.dto.identity.RegisterInput;
import com.hotelcollection.hotel.dto.identity.VerifyRegistrationInput;
import com.hotelcollection.hotel.dto.reservation.CreateReservationInput;
import com.hotelcollection.hotel.dto.reservation.GuestInput;
import com.hotelcollection.hotel.dto.reservation.RoomInput;
import com.hotelcollection.hotel.entity.Guest;
import com.hotelcollection.hotel.entity.OtpPurpose;
import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.entity.User;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.repository.GuestRepository;
import com.hotelcollection.hotel.repository.UserRepository;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.service.AuthService;
import com.hotelcollection.hotel.service.BookingService;
import com.hotelcollection.hotel.service.OtpService;

/**
 * SILENT ACCOUNT PROVISIONING — accountless bookings create a passwordless
 * 'provisioned' user account linked to the guest; a later registration with
 * the same email COMPLETES that account (password set, status active,
 * profile refreshed) instead of creating a duplicate — and the
 * pre-registration bookings appear under "My bookings" (guests.user_id).
 */
@SpringBootTest
@ContextConfiguration(classes = TestcontainersConfiguration.class)
class AccountProvisioningIntegrationTest {

	private static UUID uid(long n) { return new UUID(0, n); }

	@Autowired
	TestFixtures fixtures;
	@Autowired
	BookingService booking;
	@Autowired
	AuthService auth;
	@Autowired
	OtpService otpService;
	@Autowired
	UserRepository userRepository;
	@Autowired
	GuestRepository guestRepository;

	private String bookAccountless(TestFixtures.HotelFixture fx, String email) {
		CreateReservationInput in = new CreateReservationInput(fx.hotelId(),
				LocalDate.now().plusDays(5), LocalDate.now().plusDays(7), 2, 0,
				TestFixtures.CURRENCY,
				new GuestInput("Silent", "Booker", email, "+212600000000", "MA"),
				List.of(new RoomInput(fx.roomType().getId(), fx.ratePlan().getId())),
				List.of(), null, "provision-" + System.nanoTime(), null, null);
		return booking.create(in).reservation().getReference();
	}

	@Test
	void accountlessBookingProvisionsPasswordlessAccountAndRegistrationCompletesIt() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String email = "silent." + System.nanoTime() + "@example.com";

		bookAccountless(fx, email);

		// provisioned: no password, distinct status, guest linked
		User provisioned = userRepository.findByEmailIgnoreCase(email).orElseThrow();
		assertThat(provisioned.getStatus()).isEqualTo("provisioned");
		assertThat(provisioned.getPasswordHash()).isNull();
		Guest guest = guestRepository.findByEmailIgnoreCase(email).stream().findFirst()
				.orElseThrow();
		assertThat(guest.getUserId()).isEqualTo(provisioned.getId());

		// cannot log in before completion
		assertThatThrownBy(() -> auth.login(new LoginInput(email, "secret123")))
				.isInstanceOf(DomainException.class);

		// registration completes the SAME account (now pending_verification —
		// not yet a usable session until the OTP is confirmed)
		CurrentUser me = registerAndVerify(new RegisterInput("Silent", "Booker", email, "secret123"));
		assertThat(me.userId()).isEqualTo(provisioned.getId());

		User completed = userRepository.findByEmailIgnoreCase(email).orElseThrow();
		assertThat(completed.getStatus()).isEqualTo("active");
		assertThat(completed.getPasswordHash()).isNotBlank();

		// login now works, and "My bookings" shows the pre-registration booking
		auth.login(new LoginInput(email, "secret123"));
		as(me, () -> {
			List<Reservation> mine = booking.myReservations();
			assertThat(mine).hasSize(1);
			assertThat(mine.get(0).getGuestId()).isEqualTo(guest.getId());
			return null;
		});
	}

	@Test
	void registerWithExistingActiveEmailIsStillRejected() {
		String email = "active." + System.nanoTime() + "@example.com";
		// Must actually reach 'active' — a merely pending_verification account
		// is legitimately allowed to re-register (e.g. they lost the code).
		registerAndVerify(new RegisterInput("First", "Active", email, "secret123"));

		assertThatThrownBy(() -> auth.register(
				new RegisterInput("Other", "Person", email, "another123")))
				.isInstanceOf(DomainException.class);
	}

	@Test
	void bookingWithAProvisionedEmailDoesNotDuplicateTheAccount() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String email = "twice." + System.nanoTime() + "@example.com";

		bookAccountless(fx, email);
		UUID firstId = userRepository.findByEmailIgnoreCase(email).orElseThrow().getId();

		// a second booking with the same email reuses the provisioned account
		bookAccountless(fx, email);
		User user = userRepository.findByEmailIgnoreCase(email).orElseThrow();
		assertThat(user.getId()).isEqualTo(firstId);
		assertThat(userRepository.countByEmailIgnoreCase(email)).isEqualTo(1);
	}

	@Test
	void registrationLinksTheGuestCreatedByAnEarlierBooking() {
		TestFixtures.HotelFixture fx = fixtures.newBookableHotel();
		String email = "linked." + System.nanoTime() + "@example.com";
		String ref = bookAccountless(fx, email);

		CurrentUser me = registerAndVerify(new RegisterInput("Linked", "Guest", email, "secret123"));

		// the registration completed the provisioned account — the guest
		// record stays the SAME (no duplicate), just activated + linked
		Guest guest = guestRepository.findByEmailIgnoreCase(email).stream().findFirst()
				.orElseThrow();
		assertThat(guestRepository.findByEmailIgnoreCase(email)).hasSize(1);
		assertThat(guest.getUserId()).isEqualTo(me.userId());

		// and the earlier booking is visible under the account
		as(me, () -> {
			List<Reservation> mine = booking.myReservations();
			assertThat(mine).hasSize(1);
			assertThat(mine.get(0).getReference()).isEqualTo(ref);
			return null;
		});
	}

	/**
	 * Registers (now returns only a "check your email" pending result — no
	 * usable session) and immediately completes verification, returning the
	 * resulting session. {@code OtpService.issue} returns the plaintext code
	 * to its caller for exactly this reason — re-issuing here captures a
	 * known code (superseding the one register() already sent silently)
	 * without weakening anything real callers rely on: production code
	 * always discards that return value.
	 */
	private CurrentUser registerAndVerify(RegisterInput in) {
		String email = in.email().trim().toLowerCase();
		auth.register(in);
		String code = otpService.issue(OtpPurpose.registration_verification, email, in.firstName(), null, null);
		return auth.verifyRegistration(new VerifyRegistrationInput(email, code)).me();
	}

	/** Runs the action authenticated as the given actor. */
	private <T> T as(CurrentUser actor, java.util.function.Supplier<T> action) {
		var authToken = new UsernamePasswordAuthenticationToken(actor, null,
				actor.roles().stream().map(r -> new SimpleGrantedAuthority("ROLE_" + r)).toList());
		SecurityContextHolder.getContext().setAuthentication(authToken);
		try {
			return action.get();
		} finally {
			SecurityContextHolder.clearContext();
		}
	}
}

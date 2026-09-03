package com.hotelcollection.hotel.service.impl;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.service.AuthService;
import com.hotelcollection.hotel.service.EventPublisher;
import com.hotelcollection.hotel.service.GuestProvisioningService;
import com.hotelcollection.hotel.service.OtpService;
import com.hotelcollection.hotel.entity.OtpPurpose;
import com.hotelcollection.hotel.entity.Role;
import com.hotelcollection.hotel.entity.User;
import com.hotelcollection.hotel.entity.UserRole;
import com.hotelcollection.hotel.dto.identity.AuthPayload;
import com.hotelcollection.hotel.dto.identity.LoginInput;
import com.hotelcollection.hotel.dto.identity.RegisterInput;
import com.hotelcollection.hotel.dto.identity.RegistrationPendingResult;
import com.hotelcollection.hotel.dto.identity.ResendRegistrationOtpInput;
import com.hotelcollection.hotel.dto.identity.UpdateProfileInput;
import com.hotelcollection.hotel.dto.identity.VerifyRegistrationInput;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.repository.RoleRepository;
import com.hotelcollection.hotel.repository.UserRepository;
import com.hotelcollection.hotel.repository.UserRoleRepository;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.JwtService;
import com.hotelcollection.hotel.util.Validation;

@Service
public class AuthServiceImpl implements AuthService {

	private static final int OTP_EXPIRES_IN_MINUTES = 10;

	private final UserRepository userRepository;
	private final UserRoleRepository userRoleRepository;
	private final RoleRepository roleRepository;
	private final GuestProvisioningService guestProvisioning;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;
	private final EventPublisher eventPublisher;
	private final OtpService otpService;

	public AuthServiceImpl(UserRepository userRepository, UserRoleRepository userRoleRepository,
			RoleRepository roleRepository, GuestProvisioningService guestProvisioning,
			PasswordEncoder passwordEncoder, JwtService jwtService, EventPublisher eventPublisher,
			OtpService otpService) {
		this.userRepository = userRepository;
		this.userRoleRepository = userRoleRepository;
		this.roleRepository = roleRepository;
		this.guestProvisioning = guestProvisioning;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
		this.eventPublisher = eventPublisher;
		this.otpService = otpService;
	}

	@Override
	@Transactional
	public RegistrationPendingResult register(RegisterInput in) {
		String normalizedEmail = in.email() == null ? null : in.email().trim().toLowerCase();
		if (normalizedEmail == null || normalizedEmail.isBlank()) {
			throw DomainException.validation("email is required");
		}
		Validation.requireEmail(in.email());
		Validation.requireNotBlank(in.firstName(), "firstName");
		Validation.requireNotBlank(in.lastName(), "lastName");
		if (in.password() == null || in.password().length() < 6) {
			throw DomainException.validation("password must be at least 6 characters");
		}

		// Account completion: an accountless booking provisioned a passwordless
		// 'provisioned' user for this email — registration completes it (sets
		// the password, refreshes the profile) instead of creating a
		// duplicate. Any other existing account keeps the generic
		// no-enumeration error. A 'pending_verification' account re-registering
		// (e.g. they lost the code) is allowed too — it just resets the
		// password and issues a fresh code, same as a brand-new attempt.
		User existing = userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);
		if (existing != null && !"provisioned".equals(existing.getStatus())
				&& !"pending_verification".equals(existing.getStatus())) {
			throw DomainException.validation("registration failed — please check your details");
		}

		User user = existing != null ? existing : new User();
		if (existing == null) {
			user.setEmail(normalizedEmail);
			user.setCreatedAt(Instant.now());
		}
		user.setPasswordHash(passwordEncoder.encode(in.password()));
		user.setFirstName(in.firstName());
		user.setLastName(in.lastName());
		// Not usable yet — see verifyRegistration. findActiveWithRoles (login)
		// only ever returns 'active' users, so this alone is what blocks
		// sign-in until the code is confirmed; no extra guard needed there.
		user.setStatus("pending_verification");
		user.setUpdatedAt(Instant.now());
		userRepository.save(user);

		Role guestRole = roleRepository.findByName("guest")
				.orElseGet(() -> {
					Role r = new Role();
					r.setName("guest");
					return roleRepository.save(r);
				});
		boolean hasGuestRole = user.getUserRoles() != null
				&& user.getUserRoles().stream().anyMatch(ur -> ur.getRole() != null
						&& "guest".equals(ur.getRole().getName()));
		if (!hasGuestRole) {
			UserRole assignment = new UserRole();
			assignment.setUser(user);
			assignment.setRole(guestRole);
			userRoleRepository.save(assignment);
		}

		guestProvisioning.provisionOrLink(user.getId(), in.firstName(), in.lastName(),
				normalizedEmail);

		otpService.issue(OtpPurpose.registration_verification, normalizedEmail, in.firstName(), user.getId(), null);
		return new RegistrationPendingResult(normalizedEmail, OTP_EXPIRES_IN_MINUTES);
	}

	@Override
	@Transactional
	public AuthPayload verifyRegistration(VerifyRegistrationInput in) {
		String normalizedEmail = in.email() == null ? null : in.email().trim().toLowerCase();
		if (normalizedEmail == null || normalizedEmail.isBlank()) {
			throw DomainException.validation("email is required");
		}
		// Verifies (and consumes) the code before touching the account, same
		// order as every other proof-then-act flow in this codebase.
		otpService.verify(OtpPurpose.registration_verification, normalizedEmail, in.code(), null);

		User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
				.orElseThrow(() -> DomainException.notFound("account not found"));
		if ("pending_verification".equals(user.getStatus())) {
			user.setStatus("active");
			user.setEmailVerifiedAt(Instant.now());
			user.setUpdatedAt(Instant.now());
			userRepository.save(user);

			// Platform-wide fact (no single hotel owns a registration) — consumed
			// asynchronously by EmailEventConsumer to send the welcome email; see
			// NotificationService's class comment for why this is an event, not a
			// direct call. Fires only now — once the account is genuinely usable —
			// not at register() time.
			eventPublisher.publish("user.registered", 1, null, "user:" + user.getId(),
					Map.of("userId", user.getId(), "email", normalizedEmail, "firstName", user.getFirstName()), null);
		} else if (!"active".equals(user.getStatus())) {
			// Verified a code for an account that isn't pending verification
			// and isn't already active either (e.g. 'provisioned' — should be
			// unreachable, since register() always moves it to
			// pending_verification first) — a genuine state inconsistency.
			throw DomainException.conflict("account is not pending verification");
		}
		// else: already active — idempotent re-verification (e.g. a retried
		// request) just issues a fresh token below.

		User withRoles = userRepository.findByIdWithRoles(user.getId()).orElse(user);
		return new AuthPayload(issueToken(withRoles), currentUserOf(withRoles));
	}

	@Override
	@Transactional
	public void resendRegistrationOtp(ResendRegistrationOtpInput in) {
		String normalizedEmail = in.email() == null ? null : in.email().trim().toLowerCase();
		if (normalizedEmail == null || normalizedEmail.isBlank()) {
			return;
		}
		User user = userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);
		if (user == null || !"pending_verification".equals(user.getStatus())) {
			// No account, or nothing left to verify — silent no-op either
			// way, so this endpoint can never be used to test which emails
			// are registered.
			return;
		}
		otpService.issue(OtpPurpose.registration_verification, normalizedEmail, user.getFirstName(), user.getId(),
				null);
	}

	@Override
	@Transactional
	public AuthPayload login(LoginInput in) {
		String normalizedEmail = in.email() == null ? null : in.email().trim().toLowerCase();
		User user = userRepository.findActiveWithRoles(normalizedEmail)
				.orElseThrow(() -> DomainException.forbidden("invalid email or password"));
		if (!passwordEncoder.matches(in.password() == null ? "" : in.password(), user.getPasswordHash())) {
			throw DomainException.forbidden("invalid email or password");
		}
		user.setLastLoginAt(Instant.now());
		user.setUpdatedAt(Instant.now());
		return new AuthPayload(issueToken(user), currentUserOf(user));
	}

	@Override
	@Transactional(readOnly = true)
	public CurrentUser me(UUID userId) {
		User user = userRepository.findByIdWithRoles(userId)
				.orElseThrow(() -> DomainException.notFound("user not found"));
		return currentUserOf(user);
	}

	@Override
	@Transactional(readOnly = true)
	public User findUser(UUID userId) {
		return userRepository.findById(userId)
				.orElseThrow(() -> DomainException.notFound("user not found"));
	}

	@Override
	@Transactional
	public void updateProfile(UUID userId, UpdateProfileInput in) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> DomainException.notFound("user not found"));
		if (in.firstName() != null) {
			Validation.requireNotBlank(in.firstName(), "firstName");
			user.setFirstName(in.firstName().trim());
		}
		if (in.lastName() != null) {
			Validation.requireNotBlank(in.lastName(), "lastName");
			user.setLastName(in.lastName().trim());
		}
		if (in.phone() != null) {
			user.setPhone(in.phone().isBlank() ? null : in.phone().trim());
		}
		user.setUpdatedAt(Instant.now());
		userRepository.save(user);

		guestProvisioning.updateContactInfo(userId, in.firstName(), in.lastName(), in.phone());
	}

	private String issueToken(User user) {
		return jwtService.issue(currentUserOf(user));
	}

	private CurrentUser currentUserOf(User user) {
		List<String> roles = new ArrayList<>();
		List<UUID> hotels = new ArrayList<>();
		for (UserRole ur : user.getUserRoles()) {
			roles.add(ur.getRole().getName());
			if (ur.getHotelId() != null) {
				hotels.add(ur.getHotelId());
			}
		}
		return new CurrentUser(user.getId(), user.getEmail(), roles, hotels, Instant.now());
	}
}

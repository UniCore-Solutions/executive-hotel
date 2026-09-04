package com.hotelcollection.hotel.service.impl;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

import com.hotelcollection.hotel.entity.ExternalIdentity;
import com.hotelcollection.hotel.entity.Role;
import com.hotelcollection.hotel.entity.User;
import com.hotelcollection.hotel.entity.UserRole;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.identity.ExternalUserInfo;
import com.hotelcollection.hotel.identity.IdentityProviderType;
import com.hotelcollection.hotel.repository.ExternalIdentityRepository;
import com.hotelcollection.hotel.repository.RoleRepository;
import com.hotelcollection.hotel.repository.UserRepository;
import com.hotelcollection.hotel.repository.UserRoleRepository;
import com.hotelcollection.hotel.service.EventPublisher;
import com.hotelcollection.hotel.service.GuestProvisioningService;

/**
 * Implements the account-linking policy for external identities (see
 * docs/AUTHENTICATION.md for the authoritative table):
 * <ul>
 *   <li>identity already linked -&gt; that user, no writes beyond a possible
 *       provider-email refresh</li>
 *   <li>no local account with this email -&gt; create one, active immediately
 *       (the provider already verified the email)</li>
 *   <li>local 'provisioned'/'pending_verification' account -&gt; complete it</li>
 *   <li>local 'active' account, provider email verified -&gt; link only</li>
 *   <li>local 'active' account, provider email NOT verified, or
 *       'locked'/'inactive' -&gt; reject</li>
 * </ul>
 * Split out of {@link ExternalAuthServiceImpl} so that class stays about
 * session/state lifecycle rather than accumulating every repository this
 * policy touches.
 */
@Component
class ExternalIdentityLinker {

	private final UserRepository userRepository;
	private final UserRoleRepository userRoleRepository;
	private final RoleRepository roleRepository;
	private final ExternalIdentityRepository externalIdentityRepository;
	private final GuestProvisioningService guestProvisioning;
	private final EventPublisher eventPublisher;

	ExternalIdentityLinker(UserRepository userRepository, UserRoleRepository userRoleRepository,
			RoleRepository roleRepository, ExternalIdentityRepository externalIdentityRepository,
			GuestProvisioningService guestProvisioning, EventPublisher eventPublisher) {
		this.userRepository = userRepository;
		this.userRoleRepository = userRoleRepository;
		this.roleRepository = roleRepository;
		this.externalIdentityRepository = externalIdentityRepository;
		this.guestProvisioning = guestProvisioning;
		this.eventPublisher = eventPublisher;
	}

	User findOrLinkOrCreate(IdentityProviderType provider, ExternalUserInfo info) {
		Optional<ExternalIdentity> existingIdentity =
				externalIdentityRepository.findByProviderAndProviderSubject(provider, info.subject());
		if (existingIdentity.isPresent()) {
			ExternalIdentity identity = existingIdentity.get();
			User user = userRepository.findById(identity.getUserId())
					.orElseThrow(() -> DomainException.notFound("user not found"));
			if (info.email() != null && !info.email().equalsIgnoreCase(identity.getProviderEmail())) {
				identity.setProviderEmail(info.email());
				identity.setUpdatedAt(Instant.now());
				externalIdentityRepository.save(identity);
			}
			return user;
		}

		String normalizedEmail = info.email().trim().toLowerCase();
		String[] name = splitDisplayName(info.displayName());
		User user = userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);
		boolean isNewUser;

		if (user == null) {
			User created = new User();
			created.setEmail(normalizedEmail);
			created.setPasswordHash(null);
			created.setFirstName(name[0]);
			created.setLastName(name[1]);
			created.setStatus("active");
			created.setEmailVerifiedAt(Instant.now());
			created.setCreatedAt(Instant.now());
			created.setUpdatedAt(Instant.now());
			try {
				user = userRepository.save(created);
				attachGuestRole(user);
				guestProvisioning.provisionOrLink(user.getId(), user.getFirstName(), user.getLastName(),
						normalizedEmail);
				isNewUser = true;
			} catch (DataIntegrityViolationException ex) {
				// A concurrent sign-in for the same new email won the race —
				// reuse the winner instead of failing this one (mirrors
				// GuestProvisioningServiceImpl.ensureAccount).
				user = userRepository.findByEmailIgnoreCase(normalizedEmail)
						.orElseThrow(() -> DomainException.conflict("registration race could not be resolved"));
				isNewUser = false;
			}
		} else if ("provisioned".equals(user.getStatus()) || "pending_verification".equals(user.getStatus())) {
			if (isBlank(user.getFirstName())) {
				user.setFirstName(name[0]);
			}
			if (isBlank(user.getLastName())) {
				user.setLastName(name[1]);
			}
			user.setStatus("active");
			user.setEmailVerifiedAt(Instant.now());
			user.setUpdatedAt(Instant.now());
			userRepository.save(user);
			isNewUser = true; // never completed registration before now
		} else if ("active".equals(user.getStatus())) {
			if (!info.emailVerified()) {
				throw DomainException.forbidden("account is not available for sign-in");
			}
			isNewUser = false; // link only — profile/password untouched
		} else {
			// locked / inactive
			throw DomainException.forbidden("account is not available for sign-in");
		}

		linkIdentity(provider, info, user.getId(), normalizedEmail);

		if (isNewUser) {
			eventPublisher.publish("user.registered", 1, null, "user:" + user.getId(),
					Map.of("userId", user.getId(), "email", normalizedEmail, "firstName", user.getFirstName()), null);
		}
		eventPublisher.publish("user.external_identity_linked", 1, null, "user:" + user.getId(),
				Map.of("provider", provider.name(), "isNewUser", isNewUser), null);

		return user;
	}

	private void attachGuestRole(User user) {
		Role guestRole = roleRepository.findByName("guest")
				.orElseGet(() -> {
					Role r = new Role();
					r.setName("guest");
					return roleRepository.save(r);
				});
		UserRole assignment = new UserRole();
		assignment.setUser(user);
		assignment.setRole(guestRole);
		userRoleRepository.save(assignment);
	}

	private void linkIdentity(IdentityProviderType provider, ExternalUserInfo info, UUID userId, String email) {
		ExternalIdentity identity = new ExternalIdentity();
		identity.setUserId(userId);
		identity.setProvider(provider);
		identity.setProviderSubject(info.subject());
		identity.setProviderEmail(email);
		identity.setCreatedAt(Instant.now());
		identity.setUpdatedAt(Instant.now());
		try {
			externalIdentityRepository.save(identity);
		} catch (DataIntegrityViolationException ex) {
			// A concurrent sign-in for the same external subject won the race —
			// its identity row already exists, nothing further to do here.
		}
	}

	private static boolean isBlank(String s) {
		return s == null || s.isBlank();
	}

	private static String[] splitDisplayName(String displayName) {
		if (displayName == null || displayName.isBlank()) {
			return new String[] {"Guest", ""};
		}
		String trimmed = displayName.trim();
		int idx = trimmed.indexOf(' ');
		return idx < 0 ? new String[] {trimmed, ""}
				: new String[] {trimmed.substring(0, idx), trimmed.substring(idx + 1).trim()};
	}
}

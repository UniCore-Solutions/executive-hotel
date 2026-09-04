package com.hotelcollection.hotel.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import com.hotelcollection.hotel.entity.ExternalIdentity;
import com.hotelcollection.hotel.entity.Guest;
import com.hotelcollection.hotel.entity.Role;
import com.hotelcollection.hotel.entity.User;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.identity.ExternalUserInfo;
import com.hotelcollection.hotel.identity.IdentityProviderType;
import com.hotelcollection.hotel.repository.ExternalIdentityRepository;
import com.hotelcollection.hotel.repository.RoleRepository;
import com.hotelcollection.hotel.repository.UserRepository;
import com.hotelcollection.hotel.repository.UserRoleRepository;
import com.hotelcollection.hotel.service.EventPublisher;
import com.hotelcollection.hotel.service.GuestProvisioningService;

/** Covers every branch of the account-linking policy documented in
 * docs/AUTHENTICATION.md, plus the concurrent-signup race. */
class ExternalIdentityLinkerTest {

	private final UserRepository userRepository = mock(UserRepository.class);
	private final UserRoleRepository userRoleRepository = mock(UserRoleRepository.class);
	private final RoleRepository roleRepository = mock(RoleRepository.class);
	private final ExternalIdentityRepository externalIdentityRepository = mock(ExternalIdentityRepository.class);
	private final GuestProvisioningService guestProvisioning = mock(GuestProvisioningService.class);
	private final EventPublisher eventPublisher = mock(EventPublisher.class);

	private final ExternalIdentityLinker linker = new ExternalIdentityLinker(userRepository, userRoleRepository,
			roleRepository, externalIdentityRepository, guestProvisioning, eventPublisher);

	@Test
	void existingIdentityLogsInWithoutCreatingAnything() {
		UUID userId = UUID.randomUUID();
		User existingUser = userWithStatus(userId, "active");
		ExternalIdentity identity = new ExternalIdentity();
		identity.setUserId(userId);
		identity.setProviderEmail("guest@example.com");
		when(externalIdentityRepository.findByProviderAndProviderSubject(IdentityProviderType.GOOGLE, "sub-1"))
				.thenReturn(Optional.of(identity));
		when(userRepository.findById(userId)).thenReturn(Optional.of(existingUser));

		User result = linker.findOrLinkOrCreate(IdentityProviderType.GOOGLE,
				new ExternalUserInfo("sub-1", "guest@example.com", true, "Guest Name"));

		assertThat(result).isSameAs(existingUser);
		verify(userRepository, never()).save(any());
		verify(eventPublisher, never()).publish(any(), any(Integer.class), any(), any(), any(), any());
	}

	@Test
	void noLocalAccountCreatesAnActiveUser() {
		when(externalIdentityRepository.findByProviderAndProviderSubject(any(), any())).thenReturn(Optional.empty());
		when(userRepository.findByEmailIgnoreCase("new@example.com")).thenReturn(Optional.empty());
		when(roleRepository.findByName("guest")).thenReturn(Optional.of(new Role()));
		when(userRepository.save(any(User.class))).thenAnswer(inv -> {
			User u = inv.getArgument(0);
			u.setId(UUID.randomUUID());
			return u;
		});
		when(guestProvisioning.provisionOrLink(any(), any(), any(), any())).thenReturn(new Guest());

		User result = linker.findOrLinkOrCreate(IdentityProviderType.GOOGLE,
				new ExternalUserInfo("sub-new", "new@example.com", true, "Jane Doe"));

		assertThat(result.getStatus()).isEqualTo("active");
		assertThat(result.getPasswordHash()).isNull();
		assertThat(result.getEmailVerifiedAt()).isNotNull();
		assertThat(result.getFirstName()).isEqualTo("Jane");
		assertThat(result.getLastName()).isEqualTo("Doe");
		verify(userRoleRepository).save(any());
		verify(guestProvisioning).provisionOrLink(eq(result.getId()), any(), any(), any());
		verify(eventPublisher).publish(eq("user.registered"), any(Integer.class), any(), any(), any(), any());
		verify(eventPublisher).publish(eq("user.external_identity_linked"), any(Integer.class), any(), any(), any(),
				any());
		verify(externalIdentityRepository).save(any(ExternalIdentity.class));
	}

	@Test
	void provisionedAccountIsCompletedNotDuplicated() {
		User provisioned = userWithStatus(UUID.randomUUID(), "provisioned");
		when(externalIdentityRepository.findByProviderAndProviderSubject(any(), any())).thenReturn(Optional.empty());
		when(userRepository.findByEmailIgnoreCase("guest@example.com")).thenReturn(Optional.of(provisioned));

		User result = linker.findOrLinkOrCreate(IdentityProviderType.GOOGLE,
				new ExternalUserInfo("sub-2", "guest@example.com", true, "Guest Name"));

		assertThat(result.getStatus()).isEqualTo("active");
		assertThat(result.getPasswordHash()).isNull();
		verify(userRepository, never()).save(argThat(u -> u != provisioned));
		verify(eventPublisher).publish(eq("user.registered"), any(Integer.class), any(), any(), any(), any());
		verify(guestProvisioning, never()).provisionOrLink(any(), any(), any(), any());
	}

	@Test
	void pendingVerificationAccountIsCompleted() {
		User pending = userWithStatus(UUID.randomUUID(), "pending_verification");
		when(externalIdentityRepository.findByProviderAndProviderSubject(any(), any())).thenReturn(Optional.empty());
		when(userRepository.findByEmailIgnoreCase("guest@example.com")).thenReturn(Optional.of(pending));

		User result = linker.findOrLinkOrCreate(IdentityProviderType.GOOGLE,
				new ExternalUserInfo("sub-3", "guest@example.com", true, "Guest Name"));

		assertThat(result.getStatus()).isEqualTo("active");
		verify(eventPublisher).publish(eq("user.registered"), any(Integer.class), any(), any(), any(), any());
	}

	@Test
	void activeAccountWithVerifiedEmailIsLinkedOnly() {
		User active = userWithStatus(UUID.randomUUID(), "active");
		active.setFirstName("Original");
		active.setPasswordHash("bcrypt-hash");
		when(externalIdentityRepository.findByProviderAndProviderSubject(any(), any())).thenReturn(Optional.empty());
		when(userRepository.findByEmailIgnoreCase("guest@example.com")).thenReturn(Optional.of(active));

		User result = linker.findOrLinkOrCreate(IdentityProviderType.GOOGLE,
				new ExternalUserInfo("sub-4", "guest@example.com", true, "New Name"));

		assertThat(result.getFirstName()).isEqualTo("Original");
		assertThat(result.getPasswordHash()).isEqualTo("bcrypt-hash");
		verify(eventPublisher, never()).publish(eq("user.registered"), any(Integer.class), any(), any(), any(),
				any());
		verify(eventPublisher).publish(eq("user.external_identity_linked"), any(Integer.class), any(), any(), any(),
				any());
		verify(externalIdentityRepository).save(any(ExternalIdentity.class));
	}

	@Test
	void activeAccountWithUnverifiedProviderEmailIsRejected() {
		User active = userWithStatus(UUID.randomUUID(), "active");
		when(externalIdentityRepository.findByProviderAndProviderSubject(any(), any())).thenReturn(Optional.empty());
		when(userRepository.findByEmailIgnoreCase("guest@example.com")).thenReturn(Optional.of(active));

		assertThatThrownBy(() -> linker.findOrLinkOrCreate(IdentityProviderType.GOOGLE,
				new ExternalUserInfo("sub-5", "guest@example.com", false, "Name")))
				.isInstanceOf(DomainException.class);
		verify(externalIdentityRepository, never()).save(any());
	}

	@Test
	void lockedAccountIsRejected() {
		User locked = userWithStatus(UUID.randomUUID(), "locked");
		when(externalIdentityRepository.findByProviderAndProviderSubject(any(), any())).thenReturn(Optional.empty());
		when(userRepository.findByEmailIgnoreCase("guest@example.com")).thenReturn(Optional.of(locked));

		assertThatThrownBy(() -> linker.findOrLinkOrCreate(IdentityProviderType.GOOGLE,
				new ExternalUserInfo("sub-6", "guest@example.com", true, "Name")))
				.isInstanceOf(DomainException.class);
	}

	@Test
	void concurrentSignupForTheSameNewEmailReusesTheWinner() {
		User winner = userWithStatus(UUID.randomUUID(), "active");
		when(externalIdentityRepository.findByProviderAndProviderSubject(any(), any())).thenReturn(Optional.empty());
		when(userRepository.findByEmailIgnoreCase("race@example.com"))
				.thenReturn(Optional.empty())
				.thenReturn(Optional.of(winner));
		when(userRepository.save(any(User.class))).thenThrow(new DataIntegrityViolationException("dup"));

		User result = linker.findOrLinkOrCreate(IdentityProviderType.GOOGLE,
				new ExternalUserInfo("sub-race", "race@example.com", true, "Name"));

		assertThat(result).isSameAs(winner);
		verify(userRoleRepository, times(0)).save(any());
	}

	private static User userWithStatus(UUID id, String status) {
		User user = new User();
		user.setId(id);
		user.setEmail("guest@example.com");
		user.setStatus(status);
		user.setCreatedAt(Instant.now());
		user.setUpdatedAt(Instant.now());
		return user;
	}

	// Small local helper so tests read naturally without pulling in a matcher library extra.
	private static <T> T eq(T value) {
		return org.mockito.ArgumentMatchers.eq(value);
	}

	private static User argThat(java.util.function.Predicate<User> predicate) {
		return org.mockito.ArgumentMatchers.argThat(predicate::test);
	}
}

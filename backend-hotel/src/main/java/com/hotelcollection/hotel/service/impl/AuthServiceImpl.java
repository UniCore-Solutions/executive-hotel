package com.hotelcollection.hotel.service.impl;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.service.AuthService;
import com.hotelcollection.hotel.service.GuestProvisioningService;
import com.hotelcollection.hotel.entity.Role;
import com.hotelcollection.hotel.entity.User;
import com.hotelcollection.hotel.entity.UserRole;
import com.hotelcollection.hotel.dto.identity.AuthPayload;
import com.hotelcollection.hotel.dto.identity.LoginInput;
import com.hotelcollection.hotel.dto.identity.RegisterInput;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.repository.RoleRepository;
import com.hotelcollection.hotel.repository.UserRepository;
import com.hotelcollection.hotel.repository.UserRoleRepository;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.JwtService;
import com.hotelcollection.hotel.util.Validation;

@Service
public class AuthServiceImpl implements AuthService {

	private final UserRepository userRepository;
	private final UserRoleRepository userRoleRepository;
	private final RoleRepository roleRepository;
	private final GuestProvisioningService guestProvisioning;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;

	public AuthServiceImpl(UserRepository userRepository, UserRoleRepository userRoleRepository,
			RoleRepository roleRepository, GuestProvisioningService guestProvisioning,
			PasswordEncoder passwordEncoder, JwtService jwtService) {
		this.userRepository = userRepository;
		this.userRoleRepository = userRoleRepository;
		this.roleRepository = roleRepository;
		this.guestProvisioning = guestProvisioning;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
	}

	@Override
	@Transactional
	public AuthPayload register(RegisterInput in) {
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
		// generic error on existing email: no account enumeration on registration
		if (userRepository.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
			throw DomainException.validation("registration failed — please check your details");
		}

		User user = new User();
		user.setEmail(normalizedEmail);
		user.setPasswordHash(passwordEncoder.encode(in.password()));
		user.setFirstName(in.firstName());
		user.setLastName(in.lastName());
		user.setStatus("active");
		user.setCreatedAt(Instant.now());
		user.setUpdatedAt(Instant.now());
		userRepository.save(user);

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

		guestProvisioning.provision(user.getId(), in.firstName(), in.lastName(), normalizedEmail);

		return new AuthPayload(issueToken(user), currentUserOf(user));
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
package com.hotelcollection.hotel.service.impl;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.service.AuditService;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.dto.identity.AdminCreateUserInput;
import com.hotelcollection.hotel.dto.identity.AdminRoleView;
import com.hotelcollection.hotel.dto.identity.AdminUserRoleView;
import com.hotelcollection.hotel.dto.identity.AdminUserView;
import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.service.IdentityAdminService;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.entity.Role;
import com.hotelcollection.hotel.entity.User;
import com.hotelcollection.hotel.entity.UserRole;
import com.hotelcollection.hotel.repository.RoleRepository;
import com.hotelcollection.hotel.repository.UserRepository;
import com.hotelcollection.hotel.repository.UserRoleRepository;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.util.Validation;

/**
 * Back-office identity use cases (users, roles, assignments). Every method
 * requires super_admin; the last-super_admin revocation guard is preserved.
 */
@Service
public class IdentityAdminServiceImpl implements IdentityAdminService {

	/** Roles that are scoped to a single hotel (all others are platform-level). */
	public static final List<String> HOTEL_SCOPED_ROLES = CurrentUserAccessor.STAFF_ROLES;

	private final UserRepository userRepository;
	private final RoleRepository roleRepository;
	private final UserRoleRepository userRoleRepository;
	private final PasswordEncoder passwordEncoder;
	private final CatalogQueryService catalog;
	private final AuditService audit;
	private final CurrentUserAccessor currentUser;

	public IdentityAdminServiceImpl(UserRepository userRepository, RoleRepository roleRepository,
			UserRoleRepository userRoleRepository, PasswordEncoder passwordEncoder,
			CatalogQueryService catalog, AuditService audit, CurrentUserAccessor currentUser) {
		this.userRepository = userRepository;
		this.roleRepository = roleRepository;
		this.userRoleRepository = userRoleRepository;
		this.passwordEncoder = passwordEncoder;
		this.catalog = catalog;
		this.audit = audit;
		this.currentUser = currentUser;
	}

	@Override
	@Transactional
	public AdminUserView createUser(AdminCreateUserInput in) {
		CurrentUser actor = requireSuperAdmin();
		String email = required(in.email(), "email").trim().toLowerCase();
		Validation.requireEmail(email);
		if (in.password() == null || in.password().length() < 6) {
			throw DomainException.validation("password must be at least 6 characters");
		}
		Role role = roleRepository.findByName(in.roleName())
				.orElseThrow(() -> DomainException.validation("unknown role: " + in.roleName()));
		UUID hotelId = validateRoleScope(role.getName(), in.hotelId());
		userRepository.findByEmailIgnoreCase(email).ifPresent(existing -> {
			throw DomainException.conflict("a user with this email already exists");
		});
		User user = new User();
		user.setEmail(email);
		user.setPasswordHash(passwordEncoder.encode(in.password()));
		user.setFirstName(in.firstName());
		user.setLastName(in.lastName());
		user.setStatus("active");
		user.setCreatedAt(Instant.now());
		user.setUpdatedAt(Instant.now());
		userRepository.save(user);
		assignRoleInternal(user, role, hotelId);
		audit.record(actor, "user.created", "user", user.getId(), hotelId,
				Map.of("email", user.getEmail(), "role", role.getName()));
		return userViewReloaded(user.getId(), hotelId);
	}

	@Override
	@Transactional
	public AdminUserView assignRole(UUID userId, String roleName, UUID hotelId) {
		CurrentUser actor = requireSuperAdmin();
		Role role = roleRepository.findByName(roleName)
				.orElseThrow(() -> DomainException.validation("unknown role: " + roleName));
		UUID scope = validateRoleScope(role.getName(), hotelId);
		User user = userRepository.findById(userId)
				.orElseThrow(() -> DomainException.notFound("user not found"));
		boolean duplicate = user.getUserRoles().stream()
				.anyMatch(ur -> ur.getRole().getName().equals(role.getName())
						&& java.util.Objects.equals(ur.getHotelId(), scope));
		if (duplicate) {
			throw DomainException.conflict("this role is already assigned");
		}
		assignRoleInternal(user, role, scope);
		audit.record(actor, "role.assigned", "user", userId, scope, Map.of("role", role.getName()));
		return userViewReloaded(userId, scope);
	}

	@Override
	@Transactional
	public AdminUserView revokeRole(UUID userRoleId) {
		CurrentUser actor = requireSuperAdmin();
		UserRole assignment = userRoleRepository.findById(userRoleId)
				.orElseThrow(() -> DomainException.notFound("role assignment not found"));
		User user = assignment.getUser();
		if ("super_admin".equals(assignment.getRole().getName())) {
			long superAdmins = userRepository.findAllWithRoles().stream()
					.filter(u -> u.getUserRoles().stream()
							.anyMatch(ur -> "super_admin".equals(ur.getRole().getName())))
					.count();
			if (superAdmins <= 1) {
				throw DomainException.conflict("cannot revoke the last super_admin role");
			}
		}
		userRoleRepository.delete(assignment);
		audit.record(actor, "role.revoked", "user", user.getId(), assignment.getHotelId(),
				Map.of("role", assignment.getRole().getName()));
		return userViewReloaded(user.getId(), assignment.getHotelId());
	}

	@Override
	@Transactional(readOnly = true)
	public List<AdminUserView> users() {
		requireSuperAdmin();
		List<User> users = userRepository.findAllWithRoles();
		Map<UUID, String> hotelNames = hotelNames(users.stream()
				.flatMap(u -> u.getUserRoles().stream())
				.map(UserRole::getHotelId)
				.filter(java.util.Objects::nonNull)
				.distinct()
				.toList());
		return users.stream().map(u -> userView(u, hotelNames)).toList();
	}

	@Override
	@Transactional(readOnly = true)
	public List<AdminRoleView> roles() {
		requireSuperAdmin();
		return roleRepository.findAll().stream()
				.sorted((a, b) -> a.getName().compareTo(b.getName()))
				.map(r -> new AdminRoleView(r.getName(), HOTEL_SCOPED_ROLES.contains(r.getName())))
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, String> userEmails() {
		requireSuperAdmin();
		return userRepository.findAll().stream()
				.collect(Collectors.toMap(User::getId, User::getEmail));
	}

	private void assignRoleInternal(User user, Role role, UUID hotelId) {
		UserRole assignment = new UserRole();
		assignment.setUser(user);
		assignment.setRole(role);
		assignment.setHotelId(hotelId);
		userRoleRepository.save(assignment);
	}

	private UUID validateRoleScope(String roleName, UUID hotelId) {
		if (HOTEL_SCOPED_ROLES.contains(roleName)) {
			if (hotelId == null) {
				throw DomainException.validation(
						"role " + roleName + " must be scoped to a hotel");
			}
			catalog.getHotel(hotelId);
			return hotelId;
		}
		if (hotelId != null) {
			throw DomainException.validation("role " + roleName + " is platform-level");
		}
		return null;
	}

	private AdminUserView userViewReloaded(UUID userId, UUID scope) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> DomainException.notFound("user not found"));
		user.setUserRoles(userRoleRepository.findByUserIdWithRole(userId));
		return userView(user, hotelNames(
				user.getUserRoles().stream().map(UserRole::getHotelId)
						.filter(java.util.Objects::nonNull).distinct().toList()));
	}

	private AdminUserView userView(User user, Map<UUID, String> hotelNames) {
		List<AdminUserRoleView> roles = user.getUserRoles().stream()
				.map(ur -> new AdminUserRoleView(ur.getId(), ur.getRole().getName(),
						ur.getHotelId(),
						ur.getHotelId() == null ? null : hotelNames.get(ur.getHotelId())))
				.toList();
		return new AdminUserView(user.getId(), user.getEmail(), user.getFirstName(),
				user.getLastName(), user.getPhone(), user.getStatus(), user.getLastLoginAt(),
				user.getCreatedAt(), roles);
	}

	private Map<UUID, String> hotelNames(List<UUID> ids) {
		return catalog.hotelNamesByIds(ids);
	}

	private CurrentUser requireSuperAdmin() {
		return currentUser.requireSuperAdmin();
	}

	private String required(String value, String field) {
		if (value == null || value.isBlank()) {
			throw DomainException.validation(field + " is required");
		}
		return value;
	}
}
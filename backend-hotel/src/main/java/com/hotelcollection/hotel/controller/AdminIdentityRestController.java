package com.hotelcollection.hotel.controller;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hotelcollection.hotel.dto.identity.AdminCreateUserInput;
import com.hotelcollection.hotel.dto.identity.AdminUserView;
import com.hotelcollection.hotel.service.IdentityAdminService;

/**
 * Back-office identity write endpoints (staff users, role assignment).
 * Authorization (super_admin) is enforced inside
 * {@link IdentityAdminService}.
 */
@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminIdentityRestController {

	private final IdentityAdminService identity;

	public AdminIdentityRestController(IdentityAdminService identity) {
		this.identity = identity;
	}

	@PostMapping
	public ResponseEntity<AdminUserView> createUser(@RequestBody AdminCreateUserInput in) {
		return ResponseEntity.status(HttpStatus.CREATED).body(identity.createUser(in));
	}

	@PostMapping("/{userId}/roles")
	public AdminUserView assignRole(@PathVariable UUID userId,
			@RequestBody AssignRoleRequest in) {
		return identity.assignRole(userId, in.roleName(), in.hotelId());
	}

	@DeleteMapping("/roles/{userRoleId}")
	public AdminUserView revokeRole(@PathVariable UUID userRoleId) {
		return identity.revokeRole(userRoleId);
	}

	/** Transport-specific body for the role-assignment action. */
	public record AssignRoleRequest(String roleName, UUID hotelId) {
	}
}

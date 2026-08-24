package com.hotelcollection.hotel.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.hotelcollection.hotel.dto.identity.AdminCreateUserInput;
import com.hotelcollection.hotel.dto.identity.AdminRoleView;
import com.hotelcollection.hotel.dto.identity.AdminUserView;

/**
 * Back-office identity use cases. Every method enforces authorization
 * internally (super_admin for platform-level operations).
 */
public interface IdentityAdminService {

	AdminUserView createUser(AdminCreateUserInput in);

	AdminUserView assignRole(UUID userId, String roleName, UUID hotelId);

	AdminUserView revokeRole(UUID userRoleId);

	List<AdminUserView> users();

	List<AdminRoleView> roles();

	/** id → email for all users (audit enrichment). */
	Map<UUID, String> userEmails();
}
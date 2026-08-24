package com.hotelcollection.hotel.dto.identity;
import com.hotelcollection.hotel.entity.Platform;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Platform user with role assignments (back-office, super_admin). */
public record AdminUserView(UUID id, String email, String firstName, String lastName,
		String phone, String status, Instant lastLoginAt, Instant createdAt,
		List<AdminUserRoleView> roles) {
}

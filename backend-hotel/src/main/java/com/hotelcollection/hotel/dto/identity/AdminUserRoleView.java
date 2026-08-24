package com.hotelcollection.hotel.dto.identity;
import java.util.UUID;
import com.hotelcollection.hotel.entity.Role;

/** Role assignment: role name + optional hotel scope (null = platform-level). */
public record AdminUserRoleView(UUID id, String roleName, UUID hotelId, String hotelName) {
}

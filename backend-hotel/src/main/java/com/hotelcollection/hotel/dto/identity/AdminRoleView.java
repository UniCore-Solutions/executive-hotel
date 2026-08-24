package com.hotelcollection.hotel.dto.identity;
import com.hotelcollection.hotel.entity.Role;

/** Role definition: platform-level (super_admin, guest) or hotel-scoped. */
public record AdminRoleView(String name, boolean hotelScoped) {
}
